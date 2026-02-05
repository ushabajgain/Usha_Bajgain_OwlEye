"""
Core API Views

Basic API views for the OwlEye platform.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify the API is running.
    Returns server status and timestamp.
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
        'endpoints': {
            'health': '/api/health/',
            'auth': {
                'token': '/api/auth/token/',
                'refresh': '/api/auth/token/refresh/',
                'verify': '/api/auth/token/verify/',
            },
            'events': '/api/events/ (coming soon)',
            'incidents': '/api/incidents/ (coming soon)',
            'sos': '/api/sos/ (coming soon)',
        },
        'documentation': 'API documentation coming soon',
    })
