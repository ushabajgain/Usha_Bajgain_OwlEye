from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes # Import decorators
from rest_framework.permissions import AllowAny # Import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

# =============================================================================
# HEALTH CHECK & API ROOT
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify the API is running.
    """
    return Response({
        'status': 'healthy',
        'message': 'OwlEye API is running',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    API root endpoint providing overview of available endpoints.
    """
    return Response({
        'message': 'Welcome to OwlEye API',
        'description': 'Real-Time Event Safety, Crowd Monitoring & Emergency Response Platform',
        'version': '1.0.0',
        'auth': {
            'register': '/api/auth/register/',
            'login': '/api/auth/login/',
            'refresh': '/api/auth/token/refresh/',
            'logout': '/api/auth/logout/',
            'profile': '/api/auth/me/',
        }
    })

# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer to add user role to the token payload
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
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
    """
    Get or Update the authenticated user's profile
    """
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        try:
            # In stateless JWT, logout is client-side (delete token).
            # If creating a blocklist, we would handle the refresh token here.
            return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
