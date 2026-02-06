from rest_framework import generics, status, permissions, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Event, Ticket, Incident, SOSAlert, CrowdLocation
from .serializers import (
    RegisterSerializer, UserSerializer, EventSerializer, 
    TicketSerializer, IncidentSerializer, SOSAlertSerializer,
    SafetyAlertSerializer
)

# For WebSockets
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

# =============================================================================
# PERMISSIONS
# =============================================================================

class IsOrganizer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'ORGANIZER' or request.user.is_staff

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.organizer == request.user

# =============================================================================
# HEALTH CHECK & API ROOT
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'message': 'OwlEye API is running',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'Welcome to OwlEye API',
        'auth': {
            'register': '/api/auth/register/',
            'login': '/api/auth/login/',
        },
        'events': {
            'list': '/api/events/',
        },
        'tickets': {
            'my_tickets': '/api/tickets/my-tickets/',
            'join_event': '/api/tickets/join-event/',
            'scan': '/api/tickets/scan/',
        }
    })

# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.full_name
        token['email'] = user.email
        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    def post(self, request):
        return Response(status=status.HTTP_205_RESET_CONTENT)


# =============================================================================
# EVENT VIEWS
# =============================================================================

class EventListCreateView(generics.ListCreateAPIView):
    queryset = Event.objects.all().order_by('-created_at')
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsOrganizer()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
    
    def get_queryset(self):
        queryset = Event.objects.all().order_by('-start_date')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]


# =============================================================================
# TICKETING VIEWS
# =============================================================================

class JoinEventView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, id=event_id)

        if Ticket.objects.filter(event=event, user=request.user).exists():
            return Response(
                {"detail": "You are already registered for this event."},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_ticket_count = Ticket.objects.filter(event=event).count()
        if current_ticket_count >= event.capacity:
            return Response(
                {"detail": "This event has reached its maximum capacity."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if event.status != 'ACTIVE':
            return Response(
                {"detail": "This event is not currently accepting registrations."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket = Ticket.objects.create(event=event, user=request.user)
        serializer = TicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyTicketsView(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(user=self.request.user).order_by('-created_at')


class ScanTicketView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_token = request.data.get('qr_token')
        ticket = get_object_or_404(Ticket, qr_token=qr_token)
        event = ticket.event

        if event.organizer != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to scan tickets for this event."},
                status=status.HTTP_403_FORBIDDEN
            )

        if ticket.status == 'SCANNED':
            return Response(
                {"detail": f"Ticket already scanned at {ticket.scan_timestamp}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if ticket.status == 'INVALIDATED':
            return Response(
                {"detail": "This ticket has been invalidated."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket.status = 'SCANNED'
        ticket.scan_timestamp = timezone.now()
        ticket.save()

        event.current_attendance += 1
        event.save()

        # Log location for heatmap (at the venue location)
        CrowdLocation.objects.create(
            event=event,
            user=ticket.user,
            lat=event.location_lat,
            lng=event.location_lng,
            source='SCAN'
        )

        # Trigger real-time updates
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'attendance_{event.id}',
            {
                'type': 'attendance_update',
                'current_attendance': event.current_attendance,
                'capacity': event.capacity
            }
        )

        async_to_sync(channel_layer.group_send)(
            f'heatmap_{event.id}',
            {
                'type': 'heatmap_update',
                'points': [[event.location_lat, event.location_lng, 1.0]],
            }
        )

        serializer = TicketSerializer(ticket)
        return Response({
            "message": "Ticket validated successfully",
            "ticket": serializer.data
        }, status=status.HTTP_200_OK)

# =============================================================================
# INCIDENT VIEWS
# =============================================================================

class IncidentListCreateView(generics.ListCreateAPIView):
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if event_id:
            return Incident.objects.filter(event_id=event_id).order_by('-created_at')
        return Incident.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        incident = serializer.save(reporter=self.request.user)
        
        # Real-time Broadcast
        channel_layer = get_channel_layer()
        
        # 1. Update Live Map
        entity_data = {
            'id': f"incident-{incident.id}",
            'type': 'incident',
            'lat': incident.lat,
            'lng': incident.lng,
            'label': f"New Incident: {incident.get_category_display()}",
            'severity': incident.severity,
            'status': incident.status,
            'category': incident.category,
            'timestamp': str(timezone.now())
        }
        
        async_to_sync(channel_layer.group_send)(
            f'live_map_{incident.event.id}',
            {
                'type': 'entity_update',
                'entity': entity_data
            }
        )

class IncidentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        res = super().patch(request, *args, **kwargs)
        incident = self.get_object()
        
        # Broadcast status update to Live Map
        channel_layer = get_channel_layer()
        entity_data = {
            'id': f"incident-{incident.id}",
            'type': 'incident',
            'lat': incident.lat,
            'lng': incident.lng,
            'label': f"Incident: {incident.get_category_display()}",
            'severity': incident.severity,
            'status': incident.status,
            'category': incident.category,
            'timestamp': str(timezone.now())
        }
        
        async_to_sync(channel_layer.group_send)(
            f'live_map_{incident.event.id}',
            {
                'type': 'entity_update',
                'entity': entity_data
            }
        )
        return res

# =============================================================================
# SOS ALERT VIEWS
# =============================================================================

class SOSAlertListCreateView(generics.ListCreateAPIView):
    serializer_class = SOSAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if event_id:
            return SOSAlert.objects.filter(event_id=event_id).order_by('-created_at')
        return SOSAlert.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        sos = serializer.save(user=self.request.user)
        
        # Real-time Broadcast to Live Map with CRITICAL priority
        channel_layer = get_channel_layer()
        entity_data = {
            'id': f"sos-{sos.id}",
            'type': 'sos',
            'lat': sos.lat,
            'lng': sos.lng,
            'label': f"CRITICAL SOS: {sos.user.full_name}",
            'status': sos.status,
            'severity': 'CRITICAL',
            'timestamp': str(timezone.now())
        }
        
        async_to_sync(channel_layer.group_send)(
            f'live_map_{sos.event.id}',
            {
                'type': 'entity_update',
                'entity': entity_data
            }
        )

class SOSAlertDetailView(generics.RetrieveUpdateAPIView):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        res = super().patch(request, *args, **kwargs)
        sos = self.get_object()
        
        # Broadcast update
        channel_layer = get_channel_layer()
        entity_data = {
            'id': f"sos-{sos.id}",
            'type': 'sos',
            'lat': sos.lat,
            'lng': sos.lng,
            'label': f"SOS Update: {sos.user.full_name}",
            'status': sos.status,
            'severity': 'CRITICAL' if sos.status != 'RESOLVED' else 'LOW',
            'timestamp': str(timezone.now())
        }
        
        async_to_sync(channel_layer.group_send)(
            f'live_map_{sos.event.id}',
            {
                'type': 'entity_update',
                'entity': entity_data
            }
        )
        return res

# =============================================================================
# SAFETY ALERT VIEWS
# =============================================================================

class SafetyAlertListCreateView(generics.ListCreateAPIView):
    serializer_class = SafetyAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if event_id:
            return SafetyAlert.objects.filter(
                event_id=event_id, 
                status='ACTIVE'
            ).order_by('-created_at')
        return SafetyAlert.objects.filter(status='ACTIVE').order_by('-created_at')

    def perform_create(self, serializer):
        alert = serializer.save(created_by=self.request.user)
        
        # Real-time Broadcast
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'broadcast_{alert.event.id}',
            {
                'type': 'safety_alert',
                'alert': SafetyAlertSerializer(alert).data
            }
        )
