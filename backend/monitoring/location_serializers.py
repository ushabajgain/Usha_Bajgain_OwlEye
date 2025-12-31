"""
Location serializers for API validation and transformation.

Handles:
- Input validation from API requests
- Output serialization of location data
- Conversion between legacy and structured formats
"""

from rest_framework import serializers
from monitoring.locations import (
    LocationSchema,
    LocationValidationError,
    CoordinateValidator,
    LocationIDValidator,
    CountryValidator,
    sanitize_location_name,
)


class CoordinateField(serializers.Field):
    """
    Field for latitude or longitude with automatic validation and normalization.
    
    Usage:
        lat = CoordinateField(lat_or_lng='lat')
    """
    
    def __init__(self, lat_or_lng='lat', **kwargs):
        super().__init__(**kwargs)
        self.lat_or_lng = lat_or_lng
    
    def to_representation(self, value):
        """Convert Decimal to float for output."""
        if value is None:
            return None
        return float(value)
    
    def to_internal_value(self, data):
        """Validate and normalize coordinate."""
        try:
            coord_value = float(data)
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                f"{self.lat_or_lng} must be a number, got {data}"
            )
        
        if self.lat_or_lng == 'lat':
            lat, _ = CoordinateValidator.validate(coord_value, 0)
            return lat
        else:  # lng
            _, lng = CoordinateValidator.validate(0, coord_value)
            return lng


class LocationDataSerializer(serializers.Serializer):
    """
    Serializer for the standardized location data structure.
    
    Validates and normalizes all location input to the standard schema.
    
    Input/Output:
        {
            "country_code": "NP",
            "country_name": "Nepal",
            "location_id": "NP-KTM-05",
            "display_name": "Ward 5, Kathmandu, Nepal",  # Optional
            "lat": 27.7172,
            "lng": 85.3240
        }
    """
    
    country_code = serializers.CharField(
        max_length=2,
        min_length=2,
        help_text="ISO 3166-1 alpha-2 country code"
    )
    country_name = serializers.CharField(
        max_length=255,
        help_text="Full English country name"
    )
    location_id = serializers.CharField(
        max_length=20,
        help_text="Hierarchical location ID (e.g., NP-KTM-05)"
    )
    display_name = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=False,
        help_text="Human-readable location name (UI only)"
    )
    lat = CoordinateField(lat_or_lng='lat')
    lng = CoordinateField(lat_or_lng='lng')
    
    def validate(self, data):
        """Validate complete location schema."""
        try:
            # Let LocationSchema.validate handle all validation
            validated = LocationSchema.validate(data)
            return validated
        except LocationValidationError as e:
            raise serializers.ValidationError(str(e))


class LegacyLocationSerializer(serializers.Serializer):
    """
    Serializer for converting legacy location data to structured format.
    
    Input (legacy format):
        {
            "lat": 27.7172,
            "lng": 85.3240,
            "location_name": "Tinkune, Kathmandu",  # Optional
        }
    
    Output (structured format):
        {
            "country_code": "NP",
            "country_name": "Nepal",
            "location_id": "NP-KTM-05",
            "display_name": "Ward 5, Kathmandu, Nepal",
            "lat": 27.7172,
            "lng": 85.3240
        }
    """
    
    lat = CoordinateField(lat_or_lng='lat')
    lng = CoordinateField(lat_or_lng='lng')
    location_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Legacy location name from reverse geocoding"
    )
    country_code = serializers.CharField(
        max_length=2,
        required=False,
        default='NP',
        help_text="Defaults to NP if not provided"
    )
    
    def validate(self, data):
        """Convert to structured format and validate."""
        from monitoring.locations import LocationMigrationHelper
        
        country_code = data.get('country_code', 'NP').upper()
        lat = data['lat']
        lng = data['lng']
        display_name = data.get('location_name') or None
        
        try:
            # Use migration helper to infer location_id from coordinates
            if data.get('location_name'):
                # Sanitize the location name to prevent XSS
                display_name = sanitize_location_name(data['location_name'])
            
            migrated = LocationMigrationHelper.migrate_incident_location(
                lat=lat,
                lng=lng,
                location_name=display_name,
                country_code=country_code
            )
            return migrated
        except LocationValidationError as e:
            raise serializers.ValidationError(str(e))


class LocationFilterSerializer(serializers.Serializer):
    """
    Serializer for location-based filtering in API queries.
    
    Usage:
        GET /api/incidents/?country_code=NP&location_id=NP-KTM
        GET /api/incidents/?country_code=NP&location_id_hierarchy=NP-KTM  # includes all wards
    """
    
    country_code = serializers.CharField(
        max_length=2,
        required=False,
        help_text="Filter by country"
    )
    location_id = serializers.CharField(
        max_length=20,
        required=False,
        help_text="Filter by exact location ID"
    )
    location_id_hierarchy = serializers.CharField(
        max_length=20,
        required=False,
        help_text="Filter by location ID and all sub-locations"
    )
    
    def validate_country_code(self, value):
        """Validate country code."""
        try:
            return CountryValidator.validate_code(value)
        except LocationValidationError as e:
            raise serializers.ValidationError(str(e))
    
    def validate_location_id(self, value):
        """Validate location ID."""
        try:
            return LocationIDValidator.validate(value)
        except LocationValidationError as e:
            raise serializers.ValidationError(str(e))
    
    def validate_location_id_hierarchy(self, value):
        """Validate location ID for hierarchy queries."""
        try:
            return LocationIDValidator.validate(value)
        except LocationValidationError as e:
            raise serializers.ValidationError(str(e))


class LocationResponseSerializer(serializers.Serializer):
    """
    Serializer for returning location data in API responses.
    
    Ensures consistent formatting across all endpoints.
    """
    
    country_code = serializers.CharField()
    country_name = serializers.CharField()
    location_id = serializers.CharField()
    display_name = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
