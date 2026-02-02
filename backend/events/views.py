from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Event, TicketPackage, EventLike
from .serializers import EventSerializer, TicketPackageSerializer
from accounts.serializers import UserSerializer
from monitoring.models import ResponderLocation
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer



class IsOrganizerActive(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['organizer', 'admin']

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.organizer == request.user or request.user.role == 'admin'


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOrganizerActive]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status']
    search_fields = ['name', 'description', 'venue_address']
    ordering_fields = ['start_datetime', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.role == 'admin':
                return Event.objects.order_by('-created_at')
            if user.role == 'organizer':
                # Organizers see ONLY their own events
                return Event.objects.filter(organizer=user).order_by('-created_at')
            if user.role in ['volunteer', 'authority']:
                # Show all active events to volunteers and authorities
                return Event.objects.filter(status='active').order_by('-created_at')
        # Unauthenticated users see only active events
        return Event.objects.filter(status='active').order_by('-created_at')

    def perform_create(self, serializer):
        event = serializer.save(organizer=self.request.user)
        packages_json = self.request.data.get('ticket_packages')
        if packages_json:
            try:
                packages = json.loads(packages_json)
                for i, pkg in enumerate(packages):
                    TicketPackage.objects.create(
                        event=event,
                        name=pkg.get('name', ''),
                        price=pkg.get('price', 0),
                        description=pkg.get('description', ''),
                        perks=pkg.get('perks', ''),
                        seating_type=pkg.get('seating_type', 'Standing'),
                        color=pkg.get('color', '#2563eb'),
                        sort_order=i,
                    )
            except Exception as e:
                pass

        self.broadcast_event(event, 'created')

    def broadcast_event(self, event, action):
        channel_layer = get_channel_layer()
        for group in [f"heatmap_{event.id}", "global"]:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'event',
                    'action': action,
                    'id': event.id,
                    'name': event.name,
                    'status': event.status,
                    'category': event.category,
                    'venue': event.venue_address,
                    'capacity': event.capacity,
                    'attendee_count': event.attendee_count,
                    'start_datetime': event.start_datetime.isoformat() if event.start_datetime else None,
                    'end_datetime': event.end_datetime.isoformat() if event.end_datetime else None,
                }
            )



class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsOrganizerActive]

    def perform_update(self, serializer):
        event = serializer.save()
        packages_json = self.request.data.get('ticket_packages')
        if packages_json:
            try:
                packages = json.loads(packages_json)
                event.ticket_packages.all().delete()
                for i, pkg in enumerate(packages):
                    TicketPackage.objects.create(
                        event=event,
                        name=pkg.get('name', ''),
                        price=pkg.get('price', 0),
                        description=pkg.get('description', ''),
                        perks=pkg.get('perks', ''),
                        seating_type=pkg.get('seating_type', 'Standing'),
                        color=pkg.get('color', '#2563eb'),
                        sort_order=i,
                    )
            except Exception:
                pass
        self.broadcast_event(event, 'updated')

    def broadcast_event(self, event, action):
        channel_layer = get_channel_layer()
        for group in [f"heatmap_{event.id}", "global"]:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'event',
                    'action': action,
                    'id': event.id,
                    'name': event.name,
                    'status': event.status,
                    'category': event.category,
                    'venue': event.venue_address,
                    'capacity': event.capacity,
                    'attendee_count': event.attendee_count,
                }
            )


    def perform_destroy(self, instance):
        self.broadcast_event(instance, 'deleted')
        instance.delete()


    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class PublishEventView(APIView):
    permission_classes = [IsOrganizerActive]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if event.organizer != request.user and request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        event.status = 'active'
        event.save()
        serializer = EventSerializer(event)
        return Response(serializer.data)


class UnpublishEventView(APIView):
    permission_classes = [IsOrganizerActive]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if event.organizer != request.user and request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        event.status = 'draft'
        event.save()
        serializer = EventSerializer(event)
        return Response(serializer.data)


class ToggleLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        like, created = EventLike.objects.get_or_create(user=request.user, event=event)
        if not created:
            like.delete()
            is_liked = False
        else:
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'like_count': event.likes.count()
        })


class EventVolunteersView(APIView):
    """
    ✅ EVENT-SCOPED VOLUNTEERS (With Active Event + Recent Location Checks)
    Returns only volunteers assigned to a specific event via ResponderLocation
    
    GET /events/{event_id}/volunteers/
    Returns list of volunteers where:
    - is_active=True in ResponderLocation
    - Event is currently active (start_datetime <= now < end_datetime)
    - Volunteer has sent location data in last 5 minutes
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        
        # ⚠️ PRODUCTION: Use configurable recency window from settings
        recency_minutes = getattr(settings, 'LOCATION_RECENCY_MINUTES', 5)
        recency_cutoff = now - timedelta(minutes=recency_minutes)

        responder_locations = ResponderLocation.objects.filter(
            event_id=event_id,
            is_active=True,
            event__start_datetime__lte=now,     # Event started
            event__end_datetime__gt=now,        # Event not ended (using __gt for consistency)
            last_updated__gte=recency_cutoff    # Location data within recency window
        ).select_related('user')

        # Extract unique volunteers
        volunteers = [rl.user for rl in responder_locations]
        
        serializer = UserSerializer(volunteers, many=True)
        return Response(serializer.data)
