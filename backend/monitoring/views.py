import redis
import json
from datetime import datetime
from django.conf import settings
from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from .models import Incident, SOSAlert, SafetyAlert, ResponderLocation, IncidentLog, SOSLog, Notification
from .serializers import (
    IncidentSerializer, SOSAlertSerializer, SafetyAlertSerializer, 
    ResponderLocationSerializer, IncidentLogSerializer, SOSLogSerializer,
    NotificationSerializer
)
from .utils import log_incident_action, log_sos_action, reverse_geocode, send_notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from tickets.models import Ticket

class ReverseGeocodeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        if not lat or not lon:
            return Response({"error": "lat and lon are required"}, status=400)
        
        name = reverse_geocode(lat, lon)
        return Response({"location_name": name})

class EventOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        # Stats
        scanned_tickets = Ticket.objects.filter(event_id=event_id, status='scanned').count()
        total_tickets = Ticket.objects.filter(event_id=event_id).count()
        
        # Incident doesn't have is_active, we use status
        active_incidents = Incident.objects.filter(
            event_id=event_id
        ).exclude(status__in=['resolved', 'false']).count()
        
        # SOSAlert has status choices. Active SOS is status='active' (or pending)
        active_sos = SOSAlert.objects.filter(
            event_id=event_id, 
            status__in=['active', 'acknowledged']
        ).count()
        
        online_responders = ResponderLocation.objects.filter(
            event_id=event_id, 
            is_active=True
        ).count()
        
        return Response({
            'scanned_tickets': scanned_tickets,
            'total_tickets': total_tickets,
            'active_incidents': active_incidents,
            'active_sos': active_sos,
            'online_responders': online_responders,
        })

class CurrentLocationsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        redis_client = redis.StrictRedis(host='127.0.0.1', port=6379, db=0, decode_responses=True)
        locations_key = f"event:{event_id}:locations"
        all_locations = redis_client.hgetall(locations_key)
        
        results = []
        for user_id, data_str in all_locations.items():
            try:
                results.append(json.loads(data_str))
            except:
                pass
        
        return Response(results)

import html
from django.utils import timezone

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow viewing archived incidents if specifically requested
        include_archived = self.request.query_params.get('include_archived')
        if include_archived == 'true':
            return Incident.objects.all().order_by('-created_at')
        return self.queryset

    def perform_create(self, serializer):
        reporter = self.request.user
        data = self.request.data
        from django.core.cache import cache
        if cache.get(cache_key):
             from rest_framework.exceptions import Throttled
             raise Throttled(detail="Please wait 30 seconds before submitting another incident report.")
        cache.set(cache_key, True, 30)

        title = html.escape(data.get('title', ''))
        description = html.escape(data.get('description', ''))
        category = data.get('category')
        event_id = data.get('event')
        
        if 'latitude' not in data or 'longitude' not in data:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Location coordinates are required.")
            
        lat = float(data['latitude'])
        lon = float(data['longitude'])
        
        from .utils import enrich_location
        try:
            location_data = enrich_location(lat, lon, gps_accuracy=data.get('gps_accuracy'))
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"Location enrichment failed: {e}")
        
        accuracy = data.get('gps_accuracy')
        if accuracy and float(accuracy) > 100:
            pass

        # 3. Duplicate Detection (Instant Redis GEORADIUS)
        import redis
        redis_client = redis.StrictRedis(host='127.0.0.1', port=6379, db=0, decode_responses=False)
        incidents_key = f"event:{event_id}:incidents"
        
        nearby_incidents = redis_client.georadius(
            incidents_key,
            lon,
            lat,
            50,
            unit='m'
        )
        
        duplicate_of = None
        if nearby_incidents:
            member_id = nearby_incidents[0].decode('utf-8') if isinstance(nearby_incidents[0], bytes) else nearby_incidents[0]
            try:
                duplicate_of = Incident.objects.get(id=member_id)
            except:
                pass

        is_duplicate = duplicate_of is not None

        location_name = location_data.get('display_name') if location_data else (
            self.request.data.get('location_name') or reverse_geocode(lat, lon)
        )

        # 5. Status Mapping & Persistence
        initial_status = 'verified' if reporter.role in ['organizer', 'volunteer', 'admin'] else 'pending'

        incident = serializer.save(
            reporter=reporter, 
            title=title,
            description=description,
            status=initial_status,
            parent_incident=duplicate_of if is_duplicate else None,
            location_data=location_data,
            location_name=location_name,
            verified_at=timezone.now() if initial_status == 'verified' else None
        )
        
        if not is_duplicate:
            redis_client.execute_command('GEOADD', incidents_key, lon, lat, str(incident.id))
        else:
            from django.db.models import F
            Incident.objects.filter(pk=incident.id).update(confidence_score=F('confidence_score') + 1)
            Incident.objects.filter(pk=duplicate_of.id).update(confidence_score=F('confidence_score') + 1)
        
        # 5. Selective Notifications
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if not is_duplicate:
            staff = User.objects.filter(role__in=['organizer', 'admin'])
            for s in staff:
                send_notification(s, f"New Incident: {incident.title}", f"Reported at {incident.location_name}.", 'incident', incident.event)

        log_incident_action(incident, 'reported', reporter, new_status=incident.status)
        self.broadcast_incident(incident, 'new_incident')

    def perform_update(self, serializer):
        user = self.request.user
        old_instance = Incident.objects.get(pk=serializer.instance.pk)
        new_status = self.request.data.get('status')
        
        # 1. Role-based Status Transitions
        if new_status and new_status != old_instance.status:
            # Attendees CANNOT verify or resolve incidents
            if user.role == 'attendee' and new_status in ['verified', 'responding', 'resolved', 'false_alarm', 'closed']:
                raise permissions.exceptions.PermissionDenied("Attendees cannot change incident status.")
            
            # Volunteers can Respond and Resolve
            if user.role == 'volunteer' and new_status == 'closed':
                # Only organizers can Close/Archive
                raise permissions.exceptions.PermissionDenied("Only organizers can close/archive incidents.")

        update_fields = {}
        if new_status == 'verified' and not old_instance.verified_at:
            update_fields['verified_at'] = timezone.now()
        elif new_status == 'resolved' and not old_instance.resolved_at:
            update_fields['resolved_at'] = timezone.now()
        elif new_status == 'closed' and not old_instance.closed_at:
            update_fields['closed_at'] = timezone.now()
            update_fields['is_active'] = False

        incident = serializer.save(**update_fields)
        
        if old_instance.assigned_volunteer != incident.assigned_volunteer and incident.assigned_volunteer:
            send_notification(
                incident.assigned_volunteer,
                "Action Required: Emergency Task",
                f"You have been assigned to: {incident.title} at {incident.location_name}.",
                'assignment',
                incident.event
            )
        
        if old_instance.status != incident.status:
            send_notification(
                incident.reporter,
                f"Update: {incident.title}",
                f"Your report status is now: {incident.get_status_display()}.",
                'incident',
                incident.event
            )

        log_incident_action(
            incident, 
            'status_change' if old_instance.status != incident.status else 'updated', 
            user, 
            previous_status=old_instance.status,
            new_status=incident.status
        )
        self.broadcast_incident(incident, 'update_incident')

    def broadcast_incident(self, incident, action):
        channel_layer = get_channel_layer()
        groups = [
            f"user_{incident.reporter.id}",
            "role_organizer",
            "role_volunteer"
        ]
        
        payload = {
            'type': 'entity_broadcast',
            'entity_type': 'incident',
            'action': action,
            'id': incident.id,
            'title': incident.title,
            'category': incident.category,
            'category_display': incident.get_category_display(),
            'priority': incident.priority,
            'latitude': float(incident.latitude),
            'longitude': float(incident.longitude),
            'location_name': incident.location_name,
            'status': incident.status,
            'status_display': incident.get_status_display(),
            'description': incident.description,
            'parent_incident': incident.parent_incident_id,
            'assigned_volunteer_id': incident.assigned_volunteer.id if incident.assigned_volunteer else None,
            'assigned_volunteer_name': incident.assigned_volunteer.full_name if incident.assigned_volunteer else None,
        }
        
        for g in groups:
            async_to_sync(channel_layer.group_send)(g, payload)


from rest_framework.decorators import action

class SOSAlertViewSet(viewsets.ModelViewSet):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    from django.db import transaction

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept(self, request, pk=None):
        sos = SOSAlert.objects.select_for_update().get(pk=pk)
        user = request.user
        
        # Check if user is volunteer
        if user.role != 'volunteer':
            return Response({"error": "Only volunteers can accept SOS alerts."}, status=403)
            
        # Prevent parallel acceptance Race Conditions
        if sos.assigned_volunteer and sos.assigned_volunteer != user:
             return Response({"error": "This SOS was just accepted by another volunteer."}, status=409)
            
        sos.assigned_volunteer = user
        sos.status = 'assigned'
        sos.save()
        
        # Notify the Attendee
        send_notification(
            sos.user,
            "Help is on the way!",
            f"Your SOS has been accepted by volunteer {user.full_name}. They are responding now.",
            'sos',
            sos.event
        )

        log_sos_action(
            sos_alert=sos,
            action_type='assigned',
            performed_by=user,
            new_status=sos.status,
            notes=f"SOS accepted by volunteer {user.full_name}."
        )
        
        try:
            self.broadcast_sos(sos, 'update_sos')
        except Exception as e:
            print(f"SOS Accept Broadcast failed: {e}")
            
        return Response({"success": True, "message": "SOS alert accepted.", "status": sos.status})

    @action(detail=True, methods=['post'])
    def convert_to_incident(self, request, pk=None):
        sos = self.get_object()
        user = request.user
        
        # 1. Create Incident
        from .models import Incident
        incident = Incident.objects.create(
            event=sos.event,
            reporter=sos.user,
            assigned_volunteer=user,
            category='medical',
            priority=sos.priority,
            title=f"SOS Conversion: {sos.get_sos_type_display()}",
            description=f"Automated incident card created from SOS alert. Reported by {sos.user.full_name} at {sos.location_name}.",
            latitude=sos.latitude,
            longitude=sos.longitude,
            location_name=sos.location_name,
            status='verified'
        )
        
        sos.status = 'resolved'
        sos.is_active = False
        sos.save()

        send_notification(
            sos.user,
            "SOS Converted to Incident",
            f"Your SOS has been converted into a verified incident report (#{incident.id}).",
            'sos',
            sos.event
        )
        
        log_sos_action(
            sos_alert=sos,
            action_type='resolved',
            performed_by=user,
            new_status=sos.status,
            notes=f"SOS converted to Incident #{incident.id} by {user.full_name}."
        )
        
        try:
            self.broadcast_sos(sos, 'update_sos')
        except Exception as e:
            print(f"SOS Conversion Broadcast failed: {e}")
            
        return Response({
            "success": True, 
            "message": f"SOS converted to Incident #{incident.id}.", 
            "incident_id": incident.id
        })

    @action(detail=True, methods=['post'])
    def dispatch_assistance(self, request, pk=None):
        sos = self.get_object()
        
        # 1. Find nearest volunteer
        lat = float(sos.latitude)
        lon = float(sos.longitude)
        event_id = sos.event_id
        
        nearest_volunteer = self.find_nearest_volunteer(lat, lon, event_id)
        
        if nearest_volunteer:
            sos.assigned_volunteer = nearest_volunteer
            sos.status = 'assigned'
            sos.save()
            
            log_sos_action(
                sos_alert=sos,
                action_type='assigned',
                performed_by=request.user,
                new_status=sos.status,
                notes=f"Manually dispatched by organizer. Assigned to {nearest_volunteer.full_name}."
            )
            
            try:
                self.broadcast_sos(sos, 'update_sos')
            except Exception as e:
                print(f"SOS Dispatch Broadcast failed: {e}")
                
            return Response({
                "success": True, 
                "message": f"Successfully dispatched to {nearest_volunteer.full_name}",
                "assigned_volunteer": {
                    "id": nearest_volunteer.id,
                    "name": nearest_volunteer.full_name
                }
            })
        
        return Response({
            "success": False, 
            "message": "No available volunteers found nearby for this event."
        }, status=404)

    def perform_create(self, serializer):
        user = self.request.user
        lat = self.request.data.get('latitude')
        lon = self.request.data.get('longitude')
        event_id = self.request.data.get('event')
        
        # 0. Privileged Routing: Spam Rate Limiter
        cache_key = f"rate_limit_sos_{user.id}"
        from django.core.cache import cache
        if cache.get(cache_key):
             from rest_framework.exceptions import Throttled
             # In production, repeat strikes could trigger an account autoban flag `user.is_active = False`
             raise Throttled(detail="Please wait 30 seconds before triggering another SOS to prevent network spam.")
        cache.set(cache_key, True, 30)
        
        location_name = self.request.data.get('location_name')
        if not location_name and lat is not None and lon is not None:
            location_name = reverse_geocode(lat, lon)

        nearest_volunteer = None
        if lat and lon and event_id:
            nearest_volunteer = self.find_nearest_volunteer(float(lat), float(lon), event_id)

        sos = serializer.save(
            user=user,
            location_name=location_name,
            assigned_volunteer=nearest_volunteer
        )

        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        staff = UserModel.objects.filter(role__in=['organizer', 'admin'])
        for s in staff:
            send_notification(s, f"URGENT: SOS Alert from {user.full_name}", f"Location: {location_name}.", 'sos', sos.event)

        if nearest_volunteer:
            send_notification(
                nearest_volunteer,
                "Emergency Assigned to You!",
                f"SOS from {user.full_name} at {location_name}. Respond immediately.",
                'assignment',
                sos.event
            )

        log_sos_action(
            sos_alert=sos,
            action_type='reported',
            performed_by=self.request.user,
            new_status=sos.status,
            notes=f"Emergency SOS signal triggered at {location_name}. Nearest volunteer dispatched."
        )
        try:
            self.broadcast_sos(sos, 'new_sos')
        except Exception as e:
            print(f"SOS Broadcast failed: {e}")

    def find_nearest_volunteer(self, lat, lon, event_id):
        import redis
        redis_client = redis.StrictRedis(host='127.0.0.1', port=6379, db=0, decode_responses=False)
        
        # Georadius fetching volunteers within 50000m (covers massive regions natively out of the box)
        key = f"event:{event_id}:volunteers"
        nearby_volunteers = redis_client.georadius(
            key,
            lon,
            lat,
            50000,
            unit='m',
            withdist=True
        )
        
        if not nearby_volunteers:
            return None
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        nearest = None
        min_score = float('inf')
        
        for member, dist_meters in nearby_volunteers:
            user_id = member.decode('utf-8') if isinstance(member, bytes) else member
            try:
                volunteer = User.objects.get(id=user_id)
                active_cases = SOSAlert.objects.filter(assigned_volunteer=volunteer, status__in=['active', 'assigned']).count()
                score = dist_meters + (active_cases * 50)
                
                if score < min_score:
                    min_score = score
                    nearest = volunteer
            except:
                pass
                
        return nearest

    def perform_update(self, serializer):
        old_instance = SOSAlert.objects.get(pk=serializer.instance.pk)
        old_status = old_instance.status
        
        sos = serializer.save()
        
        if old_status != sos.status:
            log_sos_action(
                sos_alert=sos,
                action_type=sos.status if sos.status in ['assigned', 'en_route', 'arrived', 'resolved'] else 'status_change',
                performed_by=self.request.user,
                previous_status=old_status,
                new_status=sos.status,
                notes=f"SOS Status changed to {sos.status}."
            )
            
        self.broadcast_sos(sos, 'update_sos')

    def broadcast_sos(self, sos, action):
        channel_layer = get_channel_layer()
        groups = [
            f"user_{sos.user.id}",
            "role_organizer",
            "role_volunteer"
        ]
        
        payload = {
            'type': 'entity_broadcast',
            'entity_type': 'sos',
            'action': action,
            'id': sos.id,
            'user_id': sos.user.id,
            'user_name': sos.user.full_name,
            'user_phone': getattr(sos.user, 'phone_number', 'N/A'),
            'latitude': float(sos.latitude),
            'longitude': float(sos.longitude),
            'location_name': sos.location_name,
            'sos_type': sos.sos_type,
            'sos_type_display': sos.get_sos_type_display(),
            'status': sos.status,
            'priority': sos.priority,
            'assigned_volunteer_id': sos.assigned_volunteer.id if sos.assigned_volunteer else None,
            'assigned_volunteer_name': sos.assigned_volunteer.full_name if sos.assigned_volunteer else None,
        }

        for group in groups:
            async_to_sync(channel_layer.group_send)(group, payload)


class SafetyAlertViewSet(viewsets.ModelViewSet):
    queryset = SafetyAlert.objects.all()
    serializer_class = SafetyAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        alert = serializer.save(creator=self.request.user)
        self.broadcast_alert(alert)

    def broadcast_alert(self, alert):
        channel_layer = get_channel_layer()
        for group in [f"heatmap_{alert.event.id}", "global"]:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'safety_alert',
                    'id': alert.id,
                    'title': alert.title,
                    'message': alert.message,
                    'severity': alert.severity,
                    'audience': alert.audience_type,
                    'lat': float(alert.latitude) if alert.latitude else None,
                    'lng': float(alert.longitude) if alert.longitude else None,
                    'radius': alert.radius_meters,
                }
            )



class ResponderLocationViewSet(viewsets.ModelViewSet):
    queryset = ResponderLocation.objects.all()
    serializer_class = ResponderLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # UPSERT logic: check if exists for this user
        existing = ResponderLocation.objects.filter(user=self.request.user).first()
        if existing:
            serializer.instance = existing
            responder = serializer.save()
        else:
            responder = serializer.save(user=self.request.user)
        self.broadcast_location(responder)

    def perform_update(self, serializer):
        responder = serializer.save()
        self.broadcast_location(responder)

    def broadcast_location(self, responder):
        channel_layer = get_channel_layer()
        for group in [f"heatmap_{responder.event.id}", "global"]:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'responder',
                    'id': responder.user.id,
                    'user_name': responder.user.full_name,
                    'role': responder.user.role,
                    'lat': float(responder.latitude),
                    'lng': float(responder.longitude),
                    'status': responder.status,
                    'status_display': responder.get_status_display(),
                }
            )

class IncidentLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IncidentLog.objects.all().order_by('-timestamp')
    serializer_class = IncidentLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        incident_id = self.request.query_params.get('incident')
        if incident_id:
            qs = qs.filter(incident_id=incident_id)
        return qs

class SOSLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SOSLog.objects.all().order_by('-timestamp')
    serializer_class = SOSLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        sos_id = self.request.query_params.get('sos_alert')
        if sos_id:
            qs = qs.filter(sos_alert_id=sos_id)
        return qs

from rest_framework.pagination import PageNumberPagination

class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    def perform_update(self, serializer):
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        old_instance = self.get_object()
        notif = serializer.save()
        
        if not old_instance.is_read and notif.is_read:
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{notif.user.id}",
                        {
                            'type': 'entity_broadcast',
                            'entity_type': 'notification_read',
                            'id': notif.id
                        }
                    )
            except:
                pass

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{request.user.id}",
                    {
                        'type': 'entity_broadcast',
                        'entity_type': 'notification_read_all'
                    }
                )
        except:
            pass
        return Response({"success": True})

class DashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id=None):
        if not event_id:
            return Response({"error": "Event ID required"}, status=400)
        
        locations_key = f"event:{event_id}:locations"    
        try:
            from .consumers import redis_client
            active_users_data = redis_client.hgetall(locations_key)
            active_users_count = len(active_users_data)
        except:
            active_users_count = 0
            
        active_incidents = Incident.objects.filter(event_id=event_id, status__in=['pending', 'verified']).count()
        
        active_volunteers = ResponderLocation.objects.filter(event_id=event_id, is_active=True).count()
        
        active_sos = SOSAlert.objects.filter(event_id=event_id, status='active').count()

        unread_notifications = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response({
            "active_users": active_users_count,
            "active_incidents": active_incidents,
            "active_volunteers": active_volunteers,
            "active_sos": active_sos,
            "unread_count": unread_notifications,
            "server_time": datetime.now().strftime("%I:%M %p")
        })

class HeatmapView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id=None):
        if not event_id:
            return Response({"error": "Event ID required"}, status=400)

        # 1. Aggregate Active Incidents by Location Name
        from django.db.models import Count, Avg
        incidents_by_location = Incident.objects.filter(
            event_id=event_id,
            status__in=['pending', 'verified']
        ).values('location_name').annotate(
            count=Count('id'),
            avg_lat=Avg('latitude'),
            avg_lon=Avg('longitude')
        ).order_by('-count')

        # 2. Map counts to Risk Levels
        heatmap_data = []
        for item in incidents_by_location:
            name = item['location_name'] or "Unknown Area"
            count = item['count']
            lat = item['avg_lat']
            lon = item['avg_lon']
            
            risk_level = "safe"
            color = "green"
            
            if count > 5:
                risk_level = "high"
                color = "red"
            elif count >= 2:
                risk_level = "moderate"
                color = "yellow"
            
            heatmap_data.append({
                "location_name": name,
                "latitude": float(lat) if lat else None,
                "longitude": float(lon) if lon else None,
                "incident_count": count,
                "risk_level": risk_level,
                "color": color
            })

        return Response(heatmap_data)


from .models import CrowdLocation

class CrowdMovementPatternsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id=None):
        if not event_id:
            return Response({"error": "Event ID required"}, status=400)

        # Fetch the most recent 2000 location snapshots to build a "real" movement profile
        recent_locations = CrowdLocation.objects.filter(
            event_id=event_id
        ).order_by('-timestamp')[:2000]

        results = []
        for loc in recent_locations:
            results.append({
                "lat": float(loc.latitude),
                "lng": float(loc.longitude),
                "intensity": 1.0, # All real users count equally for patterns
                "timestamp": loc.timestamp
            })

        return Response(results)
