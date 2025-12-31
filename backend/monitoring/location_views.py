"""
Location management API views for OWL Eye.

Provides endpoints for:
- User location updates
- Location validation
- Location querying and filtering
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from monitoring.locations import (
    LocationSchema,
    LocationValidationError,
    CoordinateValidator,
)
from monitoring.location_serializers import (
    LocationDataSerializer,
    LegacyLocationSerializer,
    LocationFilterSerializer,
    LocationResponseSerializer,
)


class LocationValidationView:
    """
    Mixin for views that validate and manage location data.
    
    Provides common location validation methods.
    """
    
    def validate_location(self, location_data: dict) -> Response:
        """
        Validate location data and return structured result.
        
        Returns either validated location or validation errors.
        """
        serializer = LocationDataSerializer(data=location_data)
        if serializer.is_valid():
            return Response(
                {
                    "valid": True,
                    "location": serializer.validated_data
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {
                    "valid": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def convert_legacy_location(self, legacy_data: dict) -> Response:
        """
        Convert legacy location format to structured format.
        
        Handles backward compatibility for old API clients.
        """
        serializer = LegacyLocationSerializer(data=legacy_data)
        if serializer.is_valid():
            return Response(
                {
                    "success": True,
                    "location": serializer.validated_data
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class LocationViewSet(viewsets.ViewSet, LocationValidationView):
    """
    Endpoints for location validation and conversion.
    
    - POST /api/locations/validate/: Validate structured location data
    - POST /api/locations/convert/: Convert legacy format to structured
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """
        Validate structured location data.
        
        Request body:
            {
                "country_code": "NP",
                "country_name": "Nepal",
                "location_id": "NP-KTM-05",
                "display_name": "Ward 5, Kathmandu",
                "lat": 27.7172,
                "lng": 85.3240
            }
        
        Response:
            {
                "valid": true,
                "location": { ... validated location ... }
            }
        """
        return self.validate_location(request.data)
    
    @action(detail=False, methods=['post'])
    def convert(self, request):
        """
        Convert legacy location format to structured format.
        
        Request body (legacy):
            {
                "lat": 27.7172,
                "lng": 85.3240,
                "location_name": "Tinkune, Kathmandu"
            }
        
        Response:
            {
                "success": true,
                "location": { ... structured location ... }
            }
        """
        return self.convert_legacy_location(request.data)
    
    @action(detail=False, methods=['post'])
    def batch_validate(self, request):
        """
        Validate multiple locations in one request.
        
        Request body:
            {
                "locations": [
                    { "country_code": "NP", ... },
                    { "country_code": "NP", ... }
                ]
            }
        
        Response:
            {
                "results": [
                    { "valid": true, "location": { ... } },
                    { "valid": false, "errors": { ... } }
                ]
            }
        """
        locations = request.data.get('locations', [])
        if not isinstance(locations, list):
            return Response(
                {"error": "locations must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        for location_data in locations:
            serializer = LocationDataSerializer(data=location_data)
            if serializer.is_valid():
                results.append({
                    "valid": True,
                    "location": serializer.validated_data
                })
            else:
                results.append({
                    "valid": False,
                    "errors": serializer.errors
                })
        
        return Response(
            {"results": results},
            status=status.HTTP_200_OK
        )


# Mixin for model viewsets to add location endpoints
class LocationEndpointMixin:
    """
    Mixin for model viewsets to provide location-aware filtering and queries.
    
    Adds:
    - Filtering by country_code and location_id
    - Batch location operations
    """
    
    def get_queryset(self):
        """Filter queryset by location parameters."""
        queryset = super().get_queryset()
        
        # Get filter parameters from query
        country_code = self.request.query_params.get('country_code')
        location_id = self.request.query_params.get('location_id')
        location_hierarchy = self.request.query_params.get('location_hierarchy')
        
        # Apply filters if they exist
        if country_code:
            queryset = queryset.filter(country_code=country_code.upper())
        
        if location_id:
            queryset = queryset.filter(location_id=location_id.upper())
        
        if location_hierarchy:
            queryset = queryset.filter(location_id__startswith=location_hierarchy.upper())
        
        return queryset
