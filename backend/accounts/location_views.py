"""
User location endpoints for accounts app.

Provides:
- POST /api/accounts/user/location/: Update user's location
- GET /api/accounts/user/location/: Get user's current location
"""

from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet
from monitoring.locations import LocationSchema, LocationValidationError
from monitoring.location_serializers import (
    LocationDataSerializer,
    LegacyLocationSerializer,
)
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_location_update(request):
    """
    Update or create user's current location.
    
    POST /api/accounts/user/location/
    
    Request body (structured format preferred):
        {
            "country_code": "NP",
            "country_name": "Nepal",
            "location_id": "NP-KTM-05",
            "display_name": "Ward 5, Kathmandu",
            "lat": 27.7172,
            "lng": 85.3240
        }
    
    OR (legacy format - will be converted):
        {
            "lat": 27.7172,
            "lng": 85.3240,
            "location_name": "Tinkune, Kathmandu"
        }
    
    Response:
        {
            "success": true,
            "location": { ... validated location ... },
            "message": "Location updated successfully"
        }
    """
    
    # Check if using structured or legacy format
    if 'country_code' in request.data and 'location_id' in request.data:
        # Structured format
        serializer = LocationDataSerializer(data=request.data)
    else:
        # Legacy format - convert to structured
        serializer = LegacyLocationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors,
                "message": "Location validation failed"
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    location_data = serializer.validated_data
    
    try:
        # Update user's location in database
        # Note: This assumes User model has a location_data JSONField
        user = request.user
        
        # Store location data
        user.location_data = location_data
        user.country_code = location_data.get('country_code')
        user.location_id = location_data.get('location_id')
        
        # Update coordinates directly for backward compatibility
        user.latitude = location_data.get('lat')
        user.longitude = location_data.get('lng')
        user.location = location_data.get('display_name', '')
        
        user.save(update_fields=[
            'location_data',
            'country_code',
            'location_id',
            'latitude',
            'longitude',
            'location',
            'updated_at'
        ])
        
        logger.info(
            f"User {user.email} location updated: {location_data['location_id']} "
            f"({location_data['lat']}, {location_data['lng']})"
        )
        
        return Response(
            {
                "success": True,
                "location": location_data,
                "message": "Location updated successfully"
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error updating user location: {str(e)}", exc_info=True)
        return Response(
            {
                "success": False,
                "message": f"Failed to update location: {str(e)}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_location_retrieve(request):
    """
    Get user's current location.
    
    GET /api/accounts/user/location/
    
    Response:
        {
            "success": true,
            "location": {
                "country_code": "NP",
                "country_name": "Nepal",
                "location_id": "NP-KTM-05",
                "display_name": "Ward 5, Kathmandu",
                "lat": 27.7172,
                "lng": 85.3240
            }
        }
    """
    user = request.user
    
    # Check if user has structured location data
    if hasattr(user, 'location_data') and user.location_data:
        location = user.location_data
        return Response(
            {
                "success": True,
                "location": location,
                "source": "structured"
            },
            status=status.HTTP_200_OK
        )
    
    # Fall back to legacy fields
    elif user.latitude and user.longitude:
        location = {
            "lat": float(user.latitude),
            "lng": float(user.longitude),
            "display_name": user.location or "User Location",
            "country_code": getattr(user, 'country_code', 'NP'),
            "country_name": "Nepal",  # Default
            "location_id": getattr(user, 'location_id', 'NP'),
        }
        return Response(
            {
                "success": True,
                "location": location,
                "source": "legacy"
            },
            status=status.HTTP_200_OK
        )
    
    else:
        return Response(
            {
                "success": False,
                "message": "No location data available"
            },
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def user_location_delete(request):
    """
    Delete user's location data.
    
    DELETE /api/accounts/user/location/
    
    Response:
        {
            "success": true,
            "message": "Location deleted successfully"
        }
    """
    user = request.user
    
    try:
        # Clear location fields
        user.location_data = None
        user.location = None
        user.latitude = None
        user.longitude = None
        user.country_code = None
        user.location_id = None
        
        user.save(update_fields=[
            'location_data',
            'location',
            'latitude',
            'longitude',
            'country_code',
            'location_id',
            'updated_at'
        ])
        
        logger.info(f"Location deleted for user {user.email}")
        
        return Response(
            {
                "success": True,
                "message": "Location deleted successfully"
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error deleting user location: {str(e)}", exc_info=True)
        return Response(
            {
                "success": False,
                "message": f"Failed to delete location: {str(e)}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
