from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Event
from .serializers import RegisterSerializer, UserSerializer, EventSerializer

User = get_user_model()

# =============================================================================
# PERMISSIONS
# =============================================================================

class IsOrganizer(permissions.BasePermission):
    """
    Custom permission to only allow Organizers to create events.
    """
    def has_permission(self, request, view):
        return request.user.role == 'ORGANIZER' or request.user.is_staff

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
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
            'create': '/api/events/ (POST)',
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
    """
    List all events or create a new event.
    """
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
        """
        Filter events. Organizers see their own drafts. 
        Attendees only see active events (logic can be expanded).
        """
        user = self.request.user
        queryset = Event.objects.all().order_by('-start_date')
        
        # Filtering examples
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an event.
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
