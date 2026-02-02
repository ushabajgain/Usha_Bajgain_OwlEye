import redis
import json
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from .models import Incident, SOSAlert, SafetyAlert, ResponderLocation, IncidentLog, SOSLog, Notification
from .serializers import (
    IncidentSerializer, SOSAlertSerializer, SafetyAlertSerializer, 
    ResponderLocationSerializer, IncidentLogSerializer, SOSLogSerializer,
    NotificationSerializer
)
from .utils import log_incident_action, log_sos_action, reverse_geocode, send_notification
from .metrics import sos_metrics
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from tickets.models import Ticket
from accounts.models import User
from events.models import Event

# Configure logging for SOS dispatch
logger = logging.getLogger('owl_eye.dispatch')

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
        scanned_tickets = Ticket.objects.filter(event_id=event_id, status='scanned').count()
        total_tickets = Ticket.objects.filter(event_id=event_id).count()
        
        unique_attendees = Ticket.objects.filter(event_id=event_id).values_list('user_id', flat=True).distinct().count()
        
        active_volunteers = ResponderLocation.objects.filter(
            event_id=event_id,
            is_active=True,
            user__role='volunteer'
        ).count()
        
        active_incidents = Incident.objects.filter(
            event_id=event_id
        ).exclude(status__in=['resolved', 'cancelled']).count()
        
        active_sos = SOSAlert.objects.filter(
            event_id=event_id, 
            status__in=['reported', 'assigned', 'in_progress']
        ).count()
        
        online_responders = ResponderLocation.objects.filter(
            event_id=event_id, 
            is_active=True
        ).count()
        
        return Response({
            'scanned_tickets': scanned_tickets,
            'total_tickets': total_tickets,
            'unique_attendees': unique_attendees,
            'active_volunteers': active_volunteers,
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
        
        # MVP: Support filtering for responders/volunteers only
        responders_only = request.query_params.get('responders_only', 'false').lower() == 'true'
        
        results = []
        ghost_users_removed = []
        
        for user_id_str, data_str in all_locations.items():
            try:
                # Safely parse user_id
                try:
                    user_id = int(user_id_str)
                except (ValueError, TypeError):
                    redis_client.hdel(locations_key, user_id_str)
                    continue
                
                loc_data = json.loads(data_str)
                
                if not User.objects.filter(id=user_id).exists():
                    redis_client.hdel(locations_key, user_id_str)
                    ghost_users_removed.append({
                        'user_id': user_id,
                        'name': loc_data.get('name', 'Unknown')
                    })
                    continue
                
                if responders_only and loc_data.get('role') != 'volunteer':
                    continue
                    
                results.append(loc_data)
            except (ValueError, json.JSONDecodeError) as e:
                pass
        
        if ghost_users_removed:
            print(f"🚫 Removed {len(ghost_users_removed)} ghost user(s) from event {event_id}:")
            for gu in ghost_users_removed:
                print(f"   - {gu['name']} (ID: {gu['user_id']})")
        
        return Response(results)

import html
from django.utils import timezone


def check_volunteer_active_event_conflict(volunteer, excluding_event_id):
    """
    ✅ EVENT-LEVEL CONSTRAINT: Check if volunteer is assigned to another ACTIVE event
    
    A volunteer can only be assigned to ONE ACTIVE EVENT at a time.
    
    Args:
        volunteer: User object with role='volunteer'
        excluding_event_id: Current event ID to exclude from check
    
    Returns:
        dict with 'has_conflict' and 'conflicting_event' info, or None if no conflict
    """
    now = timezone.now()
    
    # 1. Check if volunteer has any active ResponderLocation in other events
    active_responder_locations = ResponderLocation.objects.filter(
        user=volunteer,
        is_active=True
    ).exclude(event_id=excluding_event_id).select_related('event')
    
    for location in active_responder_locations:
        # Is that event currently active? (within start/end datetime)
        # Use < for end_datetime to avoid blocking at exact transition time
        if location.event.start_datetime <= now < location.event.end_datetime:
            return {
                'has_conflict': True,
                'conflicting_event_id': location.event.id,
                'conflicting_event_name': location.event.name,
                'reason': 'volunteer_already_at_another_event'
            }
    
    # 2. Check if volunteer has any active assignments in other ACTIVE events
    # Use __gt (not __gte) for end_datetime to clean cutoff at event end
    active_events = Event.objects.filter(
        start_datetime__lte=now,
        end_datetime__gt=now
    ).exclude(id=excluding_event_id)
    
    conflicting_incident = Incident.objects.filter(
        assigned_volunteer=volunteer,
        event__in=active_events,
        is_active=True
    ).select_related('event').first()
    
    if conflicting_incident:
        return {
            'has_conflict': True,
            'conflicting_event_id': conflicting_incident.event.id,
            'conflicting_event_name': conflicting_incident.event.name,
            'reason': 'volunteer_has_active_incident_in_another_event'
        }
    
    conflicting_sos = SOSAlert.objects.filter(
        assigned_volunteer=volunteer,
        event__in=active_events,
        status__in=['reported', 'assigned', 'in_progress']
    ).select_related('event').first()
    
    if conflicting_sos:
        return {
            'has_conflict': True,
            'conflicting_event_id': conflicting_sos.event.id,
            'conflicting_event_name': conflicting_sos.event.name,
            'reason': 'volunteer_has_active_sos_in_another_event'
        }
    
    # No conflict found
    return None


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on the earth (in kilometers)
    
    Args:
        lat1, lon1: Coordinates of first point (in decimal degrees)
        lat2, lon2: Coordinates of second point (in decimal degrees)
    
    Returns:
        Distance in kilometers
    """
    from math import radians, cos, sin, asin, sqrt
    
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    
    return c * r


def find_nearby_volunteers(latitude, longitude, event_id, radius_km=None):
    """
    🎯 STEP 5.3.1 — Find nearby volunteers for SOS proximity broadcasting
    
    Gets eligible responders with:
    - Same event_id
    - is_active=True
    - Event currently active (start_datetime <= now < end_datetime)
    - Location data recent (last_updated within LOCATION_RECENCY_MINUTES)
    - Not currently handling another active incident/SOS ⚠️ NEW
    - Within proximity radius (default from settings)
    
    ⚠️ PRODUCTION NOTES:
    This function is designed for real-time dispatch systems and respects:
    - LOCATION_RECENCY_MINUTES: Configurable window (default 5 min)
    - SOS_PROXIMITY_RADIUS_KM: Geographic radius for targeting (default 2 km)
    - FALLBACK_VOLUNTEER_LIMIT: Max volunteers when no nearby (default 10)
    
    Fallback: If no one within radius, returns closest N volunteers
    
    Args:
        latitude: SOS alert latitude
        longitude: SOS alert longitude
        event_id: Event ID
        radius_km: Search radius in kilometers (default from settings.SOS_PROXIMITY_RADIUS_KM)
    
    Returns:
        List of tuples: [(user_object, distance_km), ...]
        If no nearby responders, returns up to FALLBACK_VOLUNTEER_LIMIT closest volunteers
    """
    from django.utils import timezone
    from django.conf import settings
    
    now = timezone.now()
    
    # Use configurable recency window from settings (default 5 min)
    recency_minutes = getattr(settings, 'LOCATION_RECENCY_MINUTES', 5)
    recency_cutoff = now - timedelta(minutes=recency_minutes)
    
    # Use configurable proximity radius from settings (default 2 km)
    if radius_km is None:
        radius_km = getattr(settings, 'SOS_PROXIMITY_RADIUS_KM', 2.0)
    
    eligible_responders = ResponderLocation.objects.filter(
        event_id=event_id,
        is_active=True,
        event__start_datetime__lte=now,
        event__end_datetime__gt=now,
        last_updated__gte=recency_cutoff
    ).select_related('user', 'event')
    
    # ⚠️ PRODUCTION FIX: Filter out volunteers already handling active incidents
    # This prevents sending SOS to a volunteer who's already engaged
    eligible_responders = eligible_responders.exclude(
        user__assigned_incidents__status__in=['pending', 'verified', 'responding']
    ).exclude(
        user__sosalert__status__in=['assigned', 'in_progress']
    ).distinct()
    
    nearby_volunteers = []
    all_distances = []  # Keep track of all for fallback
    
    for responder in eligible_responders:
        if responder.latitude is None or responder.longitude is None:
            continue
            
        distance_km = calculate_haversine_distance(
            latitude, longitude,
            float(responder.latitude), float(responder.longitude)
        )
        
        all_distances.append((responder.user, distance_km))
        
        # Filter by radius for primary list
        if distance_km <= radius_km:
            nearby_volunteers.append((responder.user, distance_km))
    
    # Sort by distance (closest first)
    nearby_volunteers.sort(key=lambda x: x[1])
    all_distances.sort(key=lambda x: x[1])
    
    # Fallback: If no one nearby, return closest N volunteers
    # ⚠️ PRODUCTION FIX: Limit fallback to prevent broadcast storm
    if not nearby_volunteers and all_distances:
        fallback_limit = getattr(settings, 'FALLBACK_VOLUNTEER_LIMIT', 10)
        nearby_volunteers = all_distances[:fallback_limit]
        print(f"[SOS_FALLBACK] No nearby volunteers. Broadcasting to {len(nearby_volunteers)} closest.")
    
    return nearby_volunteers


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
        cache_key = f"incident_report_{reporter.id}"
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
            # MVP: If enrichment fails, use minimal data
            location_data = {
                "latitude": lat,
                "longitude": lon,
                "accuracy": data.get('gps_accuracy', 50),
                "source": "gps"
            }
        
        accuracy = data.get('gps_accuracy')
        if accuracy and float(accuracy) > 100:
            pass

        # MVP: Duplicate detection disabled for demo
        duplicate_of = None
        is_duplicate = False

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
            parent_incident=None,
            location_data=location_data,
            location_name=location_name,
            verified_at=timezone.now() if initial_status == 'verified' else None
        )
        
        # 5. Selective Notifications
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        staff = User.objects.filter(role__in=['organizer', 'admin'])
        for s in staff:
            send_notification(s, f"New Incident: {incident.title}", f"Reported at {incident.location_name}.", 'incident', incident.event)

        log_incident_action(incident, 'reported', reporter, new_status=incident.status)
        self.broadcast_incident(incident, 'new_incident')

    def perform_update(self, serializer):
        user = self.request.user
        old_instance = Incident.objects.get(pk=serializer.instance.pk)
        new_status = self.request.data.get('status')
        assigned_volunteer_id = self.request.data.get('assigned_volunteer')
        
        # ✅ EVENT-LEVEL + TASK-LEVEL CONSTRAINT: Volunteer can only be assigned to ONE ACTIVE event at a time
        if assigned_volunteer_id and assigned_volunteer_id != (old_instance.assigned_volunteer.id if old_instance.assigned_volunteer else None):
            # Volunteer is being assigned to this incident (new assignment or change)
            try:
                volunteer = User.objects.get(id=assigned_volunteer_id)
            except User.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"assigned_volunteer": "Volunteer not found."})
            
            # ✅ STRICT SCOPE CHECK: Volunteer must belong to the SAME event as the incident
            volunteer_in_event = ResponderLocation.objects.filter(
                user=volunteer,
                event_id=old_instance.event_id,
                is_active=True
            ).exists()
            
            if not volunteer_in_event:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    "assigned_volunteer": "Volunteer must be assigned to the same event as this incident. They cannot be assigned across events."
                })
            
            # Check for EVENT-level conflict (volunteer already assigned to another ACTIVE event)
            conflict_info = check_volunteer_active_event_conflict(volunteer, old_instance.event_id)
            if conflict_info and conflict_info['has_conflict']:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    "assigned_volunteer": f"Volunteer is already assigned to {conflict_info['conflicting_event_name']} event. They can only handle one active event at a time."
                })
        
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

    def get_queryset(self):
        # Filter out resolved and cancelled SOS alerts to prevent stale notifications
        # Only show active SOS alerts (reported, assigned, in_progress)
        return self.queryset.exclude(status__in=['resolved', 'cancelled']).order_by('-created_at')

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept(self, request, pk=None):
        sos = SOSAlert.objects.select_for_update().get(pk=pk)
        user = request.user
        
        # Check if user is volunteer
        if user.role != 'volunteer':
            return Response({"error": "Only volunteers can accept SOS alerts."}, status=403)
        
        # ✅ STEP 5.3.3 GUARD: Prevent accepting already-assigned SOS
        if sos.assigned_volunteer:
            # ⚠️ PRODUCTION IMPROVEMENT: Return who accepted for better UX
            # ✅ LOG METRICS: Track 409 conflicts
            sos_metrics.log_sos_conflict(
                sos_id=sos.id,
                first_volunteer=sos.assigned_volunteer.full_name,
                second_volunteer=user.full_name
            )
            
            return Response({
                "error": f"Already accepted by {sos.assigned_volunteer.full_name}",
                "assigned_volunteer_name": sos.assigned_volunteer.full_name,
                "assigned_volunteer_id": sos.assigned_volunteer.id,
                "status_code": "sos_already_accepted"
            }, status=409)
            
        # ✅ STRICT SCOPE CHECK: Volunteer must be in the same event as the SOS
        volunteer_in_event = ResponderLocation.objects.filter(
            user=user,
            event_id=sos.event_id,
            is_active=True
        ).exists()
        
        if not volunteer_in_event:
            return Response({
                "error": "You are not assigned to this event. You can only accept SOS alerts from your assigned event.",
                "status_code": "volunteer_not_in_event"
            }, status=403)
        
        # ✅ EVENT-LEVEL CONSTRAINT: Check if volunteer is already assigned to another ACTIVE event
        conflict_info = check_volunteer_active_event_conflict(user, sos.event_id)
        if conflict_info and conflict_info['has_conflict']:
            return Response({
                "error": f"You are already assigned to {conflict_info['conflicting_event_name']} event. You can only handle one active event at a time.",
                "status_code": "volunteer_busy"
            }, status=409)
            
        sos.assigned_volunteer = user
        sos.status = 'assigned'
        sos.save()
        
        # ✅ LOG METRICS: Track acceptance with distance and response time
        try:
            # Calculate distance from volunteer location to SOS location
            volunteer_location = ResponderLocation.objects.filter(
                user=user, 
                event_id=sos.event_id,
                is_active=True
            ).first()
            
            distance_km = None
            if volunteer_location and volunteer_location.latitude and volunteer_location.longitude:
                distance_km = calculate_haversine_distance(
                    float(sos.latitude), float(sos.longitude),
                    float(volunteer_location.latitude), float(volunteer_location.longitude)
                )
            
            # Calculate response time (time since SOS creation)
            acceptance_time = (timezone.now() - sos.created_at).total_seconds()
            
            sos_metrics.log_sos_accepted(
                sos_id=sos.id,
                volunteer_name=user.full_name,
                distance_km=distance_km or 0,
                acceptance_seconds=acceptance_time
            )
        except Exception as e:
            logger.error(f"[METRICS_ERROR] Failed to log SOS acceptance metrics: {e}")
        
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
        
        # 🎯 LOG COMPLETION: Log total response time from SOS creation to resolution
        completion_seconds = (timezone.now() - sos.created_at).total_seconds()
        sos_metrics.log_sos_completed(
            sos_id=sos.id,
            completion_seconds=completion_seconds
        )

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
            # ✅ STRICT SCOPE CHECK: Verify volunteer is in this event
            volunteer_in_event = ResponderLocation.objects.filter(
                user=nearest_volunteer,
                event_id=event_id,
                is_active=True
            ).exists()
            
            if not volunteer_in_event:
                return Response({
                    "success": False, 
                    "message": f"Volunteer is not assigned to this event. SOS can only be dispatched to volunteers in the same event.",
                    "status_code": "volunteer_not_in_event"
                }, status=400)
            
            # ✅ EVENT-LEVEL CONSTRAINT: Check if volunteer is already assigned to another ACTIVE event
            conflict_info = check_volunteer_active_event_conflict(nearest_volunteer, event_id)
            if conflict_info and conflict_info['has_conflict']:
                return Response({
                    "success": False, 
                    "message": f"Volunteer {nearest_volunteer.full_name} is already assigned to {conflict_info['conflicting_event_name']} event. They can only handle one active event at a time.",
                    "status_code": "volunteer_busy"
                }, status=409)
            
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

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a SOS alert as read by the organizer/admin"""
        sos = self.get_object()
        sos.is_read = True
        sos.save()
        return Response({
            "success": True,
            "message": "SOS alert marked as read",
            "id": sos.id,
            "is_read": sos.is_read
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        try:
            user = self.request.user
            lat = self.request.data.get('latitude')
            lon = self.request.data.get('longitude')
            event_id = self.request.data.get('event')
            
            # ⚠️ BACKPRESSURE GUARD: Prevent system overload under stress
            # If too many active SOS exist, reject new ones gracefully
            # NOTE: Frontend handles the 30-second rate limiting with countdown timer
            # Backend only guards against system overload
            from django.conf import settings
            max_active_sos = getattr(settings, 'MAX_ACTIVE_SOS', 500)
            active_sos_count = SOSAlert.objects.filter(status__in=['reported', 'assigned']).count()
            
            if active_sos_count >= max_active_sos:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(f"System under heavy load ({active_sos_count} active SOS). Please try again in a moment.")
            
            location_name = self.request.data.get('location_name')
            
            # Save SOS without auto-assignment (will be assigned when volunteer accepts)
            sos = serializer.save(user=user, location_name=location_name)
            
            # 🎯 STEP 5.3: Find nearby volunteers (don't auto-assign yet)
            nearby_volunteers = []
            if lat and lon and event_id:
                try:
                    nearby_volunteers = find_nearby_volunteers(
                        float(lat), float(lon), int(event_id), radius_km=2
                    )
                except Exception as e:
                    print(f"[WARN] find_nearby_volunteers failed: {e}")
                    nearby_volunteers = []

            # Log SOS metrics safely
            try:
                eligible_responders = ResponderLocation.objects.filter(
                    event_id=event_id,
                    is_active=True,
                    event__start_datetime__lte=timezone.now(),
                    event__end_datetime__gt=timezone.now()
                ).count()
                
                fallback_triggered = len(nearby_volunteers) == 0 and eligible_responders > 0
                sos_metrics.log_sos_created(
                    sos_id=sos.id,
                    event_id=event_id,
                    nearby_count=len(nearby_volunteers),
                    fallback=fallback_triggered
                )
            except Exception as e:
                print(f"[WARN] log_sos_created failed: {e}")

            # Notify staff about the SOS
            try:
                from django.contrib.auth import get_user_model
                UserModel = get_user_model()
                staff = UserModel.objects.filter(role__in=['organizer', 'admin'])
                for s in staff:
                    send_notification(s, f"URGENT: SOS Alert from {user.full_name}", f"Location: {location_name}.", 'sos', sos.event)
            except Exception as e:
                print(f"[WARN] Staff notification failed: {e}")

            # Notify nearby volunteers (don't assign, just alert them to accept)
            if nearby_volunteers:
                try:
                    for volunteer, distance in nearby_volunteers:
                        distance_text = f"{distance:.2f}km away" if distance else "in your area"
                        send_notification(
                            volunteer,
                            "Emergency SOS Alert Nearby!",
                            f"SOS from {user.full_name} at {location_name} ({distance_text}). Tap to respond.",
                            'assignment',
                            sos.event
                        )
                except Exception as e:
                    print(f"[WARN] Volunteer notification failed: {e}")

            # Log action
            try:
                log_sos_action(
                    sos_alert=sos,
                    action_type='reported',
                    performed_by=self.request.user,
                    new_status=sos.status,
                    notes=f"Emergency SOS signal triggered at {location_name}. Broadcast to {len(nearby_volunteers)} nearby volunteers."
                )
            except Exception as e:
                print(f"[WARN] log_sos_action failed: {e}")
            
            # Broadcast to nearby volunteers
            try:
                self.broadcast_sos_to_nearby_volunteers(sos, nearby_volunteers)
            except Exception as e:
                print(f"[WARN] SOS Targeted Broadcast failed: {e}")
                
        except Exception as e:
            print(f"[ERROR] perform_create failed: {e}")
            import traceback
            traceback.print_exc()
            raise
        
        # Also broadcast to organizers/admins for awareness
        try:
            self.broadcast_sos(sos, 'new_sos')
        except Exception as e:
            print(f"SOS Organizer Broadcast failed: {e}")


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
                active_cases = SOSAlert.objects.filter(assigned_volunteer=volunteer, status__in=['assigned', 'in_progress']).count()
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
            
            # 🎯 LOG COMPLETION: When SOS is fully resolved, log total response time
            if sos.status == 'resolved':
                completion_seconds = (timezone.now() - sos.created_at).total_seconds()
                sos_metrics.log_sos_completed(
                    sos_id=sos.id,
                    completion_seconds=completion_seconds
                )
            
        self.broadcast_sos(sos, 'update_sos')

    def broadcast_sos(self, sos, action):
        """
        Broadcast SOS updates to organizers and the attendee (not to volunteers)
        
        ✅ STEP 5.3.5: Removed 'role_volunteer' from recipients
        - Volunteers now ONLY receive SOS alerts via targeted SOS_NEARBY messages
        - This prevents global broadcast noise to all volunteers
        - Only nearby volunteers (within 2km) receive alerts
        """
        channel_layer = get_channel_layer()
        groups = [
            f"user_{sos.user.id}",       # Attendee who made SOS
            "role_organizer",             # Organizers for awareness/management
            "role_admin"                  # Admins for monitoring
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

    def broadcast_sos_to_nearby_volunteers(self, sos, nearby_volunteers_list):
        """
        🎯 STEP 5.3.2 — Targeted WebSocket Broadcast
        
        Sends SOS alert ONLY to nearby volunteers (not global broadcast)
        
        Args:
            sos: SOSAlert instance
            nearby_volunteers_list: List of tuples [(user_object, distance_km), ...]
                                    from find_nearby_volunteers()
        
        Payload sent to each volunteer:
        {
            "type": "SOS_NEARBY",
            "sos_id": int,
            "event_id": int,
            "latitude": float,
            "longitude": float,
            "distance": float or None,
            "sos_type": str,
            "priority": str,
            "user_name": str,
            "location_name": str,
            "message": str
        }
        """
        channel_layer = get_channel_layer()
        
        for volunteer, distance_km in nearby_volunteers_list:
            # Target only this specific volunteer via their user channel
            user_channel = f"user_{volunteer.id}"
            
            # Build distance message
            distance_str = f"{distance_km:.2f}km away" if distance_km else "in your area"
            
            payload = {
                'type': 'sos_nearby',  # Type for handler in consumer
                'sos_id': sos.id,
                'event_id': sos.event_id,
                'latitude': float(sos.latitude),
                'longitude': float(sos.longitude),
                'distance': distance_km,
                'distance_text': distance_str,
                'sos_type': sos.sos_type,
                'sos_type_display': sos.get_sos_type_display(),
                'priority': sos.priority,
                'user_name': sos.user.full_name,
                'user_phone': getattr(sos.user, 'phone_number', 'N/A'),
                'location_name': sos.location_name,
                'status': sos.status,
                'message': f"Emergency SOS from {sos.user.full_name} at {sos.location_name} ({distance_str})"
            }
            
            # Send to only this volunteer
            async_to_sync(channel_layer.group_send)(user_channel, payload)


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

    def get_queryset(self):
        """Filter responders based on user role"""
        qs = super().get_queryset()
        user = self.request.user
        
        # Organizers see responders only from their events
        if user.role == 'organizer':
            qs = qs.filter(event__organizer=user)
        # Volunteers see only their own location
        elif user.role == 'volunteer':
            qs = qs.filter(user=user)
        # Admins see all
        
        return qs

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

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign(self, request):
        """
        ✅ ORGANIZER ASSIGNMENT ENDPOINT
        POST /monitoring/responders/assign/
        
        Organizer assigns volunteer to an event by creating/updating ResponderLocation
        
        Body: {
            "volunteer_id": 5,
            "event_id": 3,
            "status": "available"  (optional, defaults to 'available')
        }
        """
        # Only organizers and admins can assign
        if request.user.role not in ['organizer', 'admin']:
            return Response({
                "error": "Only organizers and admins can assign volunteers."
            }, status=403)
        
        volunteer_id = request.data.get('volunteer_id')
        event_id = request.data.get('event_id')
        status = request.data.get('status', 'available')
        
        if not volunteer_id or not event_id:
            return Response({
                "error": "volunteer_id and event_id are required"
            }, status=400)
        
        try:
            volunteer = User.objects.get(id=volunteer_id, role='volunteer')
            event = Event.objects.get(id=event_id)
        except (User.DoesNotExist, Event.DoesNotExist):
            return Response({
                "error": "Volunteer or event not found"
            }, status=404)
        
        # Organizer can only assign to their own events
        if request.user.role == 'organizer' and event.organizer != request.user:
            return Response({
                "error": "You can only assign volunteers to your own events"
            }, status=403)
        
        # UPSERT: Create or update ResponderLocation
        responder, created = ResponderLocation.objects.update_or_create(
            user=volunteer,
            event=event,
            defaults={
                'status': status,
                'is_active': True,
                'latitude': 0.0,  # Volunteer will update their location
                'longitude': 0.0
            }
        )
        
        serializer = self.get_serializer(responder)
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unassign(self, request):
        """
        ✅ ORGANIZER UNASSIGNMENT ENDPOINT
        POST /monitoring/responders/unassign/
        
        Organizer removes volunteer from an event
        
        Body: {
            "volunteer_id": 5,
            "event_id": 3
        }
        """
        # Only organizers and admins can unassign
        if request.user.role not in ['organizer', 'admin']:
            return Response({
                "error": "Only organizers and admins can unassign volunteers."
            }, status=403)
        
        volunteer_id = request.data.get('volunteer_id')
        event_id = request.data.get('event_id')
        
        if not volunteer_id or not event_id:
            return Response({
                "error": "volunteer_id and event_id are required"
            }, status=400)
        
        try:
            responder = ResponderLocation.objects.get(
                user_id=volunteer_id,
                event_id=event_id
            )
            
            # Organizer can only unassign from their own events
            if request.user.role == 'organizer' and responder.event.organizer != request.user:
                return Response({
                    "error": "You can only manage volunteers from your own events"
                }, status=403)
            
            responder.delete()
            return Response({
                "success": True,
                "message": "Volunteer unassigned from event"
            }, status=200)
        except ResponderLocation.DoesNotExist:
            return Response({
                "error": "Volunteer not assigned to this event"
            }, status=404)

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
        from django.utils import timezone
        from datetime import timedelta
        
        # Only show notifications from the last 30 days or unread notifications
        thirty_days_ago = timezone.now() - timedelta(days=30)
        queryset = self.queryset.filter(user=self.request.user)
        
        # Include unread notifications regardless of age, but limit read ones to last 30 days
        from django.db.models import Q
        queryset = queryset.filter(
            Q(is_read=False) | Q(created_at__gte=thirty_days_ago)
        ).order_by('-created_at')
        
        return queryset

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
        
        # GAP 1 FIX: Only count volunteers in active events
        # GAP 2 FIX: Only count volunteers with recent location data (within 5 min)
        now = timezone.now()
        five_minutes_ago = now - timedelta(minutes=5)
        active_volunteers = ResponderLocation.objects.filter(
            event_id=event_id, 
            is_active=True,
            event__start_datetime__lte=now,
            event__end_datetime__gt=now,
            last_updated__gte=five_minutes_ago
        ).count()
        
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
