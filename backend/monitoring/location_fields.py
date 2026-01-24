"""
Location-aware model fields and mixins for OwlEye.

Provides structured location storage and validation for tracking-related models.
"""

from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.postgres.fields import JSONField
import json
from monitoring.locations import LocationSchema, LocationValidationError


class LocationDataField(models.JSONField):
    """
    Custom JSONField that enforces the standardized location schema.
    
    Automatically validates and normalizes location data on save.
    
    Example usage:
        class MyModel(models.Model):
            location = LocationDataField()
    """
    
    def to_python(self, value):
        """Convert database value to Python dict and validate."""
        if value is None:
            return None
        
        if isinstance(value, str):
            value = json.loads(value)
        
        if not isinstance(value, dict):
            raise ValidationError(f"Expected dict, got {type(value)}")
        
        # Validate location schema
        try:
            return LocationSchema.validate(value)
        except LocationValidationError as e:
            raise ValidationError(f"Invalid location data: {str(e)}")
    
    def get_prep_value(self, value):
        """Prepare value for database storage."""
        if value is None:
            return None
        
        if isinstance(value, dict):
            validated = self.to_python(value)
            return json.dumps(validated, default=str)
        
        return value


class LocationMixin(models.Model):
    """
    Mixin for models that store structured location data.
    
    Provides:
    - location_data: JSONField with validated location schema
    - country_code: Denormalized for filtering and analytics
    - location_id: Denormalized for analytics grouping
    """
    
    location_data = LocationDataField(
        help_text="Structured location: {country_code, country_name, location_id, display_name, lat, lng}"
    )
    
    # Denormalized fields for efficient querying
    country_code = models.CharField(
        max_length=2,
        db_index=True,
        help_text="ISO 3166-1 alpha-2 country code (denormalized from location_data)"
    )
    location_id = models.CharField(
        max_length=20,
        db_index=True,
        help_text="Hierarchical location ID for analytics grouping (denormalized from location_data)"
    )
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        """Sync denormalized fields from location_data."""
        if self.location_data:
            self.country_code = self.location_data.get('country_code', '')
            self.location_id = self.location_data.get('location_id', '')
        super().save(*args, **kwargs)
    
    def get_display_name(self) -> str:
        """Get human-readable location name."""
        if not self.location_data:
            return "Unknown Location"
        return self.location_data.get('display_name', 'Unknown Location')
    
    def get_coordinates(self) -> tuple:
        """Get (lat, lng) tuple."""
        if not self.location_data:
            return (None, None)
        return (
            self.location_data.get('lat'),
            self.location_data.get('lng')
        )


class LocationQueryMixin:
    """
    Mixin for models.Manager to provide location-aware queries.
    """
    
    def by_country(self, country_code: str):
        """Filter by country code."""
        return self.filter(country_code=country_code.upper())
    
    def by_location_id(self, location_id: str):
        """Filter by location_id (zone/region/ward)."""
        return self.filter(location_id=location_id.upper())
    
    def by_location_hierarchy(self, location_id: str):
        """
        Filter by location ID and all sub-locations.
        
        Example:
            - Filter by 'NP-KTM' returns 'NP-KTM', 'NP-KTM-01', 'NP-KTM-05', etc.
        """
        return self.filter(location_id__startswith=location_id.upper())
    
    def in_proximity(self, lat: float, lng: float, radius_km: float):
        """
        Filter locations within radius (requires PostGIS or similar).
        
        This is a placeholder for GeoDjango implementation.
        """
        # TODO: Implement with PostGIS / GeoDjango
        raise NotImplementedError("Proximity queries require GeoDjango")
