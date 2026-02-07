"""
Strict Location Format Enforcement for OwlEye Platform

This module enforces a structured, machine-readable location format across
the entire system. All location data must conform to the standard schema:

{
    "country_code": "NP",           # ISO 3166-1 alpha-2 (immutable)
    "country_name": "Nepal",        # Full English name (immutable)
    "location_id": "NP-KTM-05",     # Hierarchical ID (immutable)
    "display_name": "Ward 5, Kathmandu, Nepal",  # UI only
    "lat": 27.7172,                 # Precise coordinates (required for tracking)
    "lng": 85.3240
}

CRITICAL RULES:
- Never use display_name for backend logic (filtering, routing, etc.)
- Always use location_id for analytics and grouping
- Always use country_code for global filtering
- Coordinates are mandatory for all tracking operations
- location_id must be uppercase and hyphen-separated
"""

from decimal import Decimal, InvalidOperation
from typing import Dict, Optional, Tuple, Any
import re

ISO_COUNTRIES = {
    "NP": "Nepal",
    "IN": "India",
    "BD": "Bangladesh",
    "PK": "Pakistan",
    "US": "United States",
    "GB": "United Kingdom",
    "AU": "Australia",
    "CA": "Canada",
    "DE": "Germany",
    "FR": "France",
    "JP": "Japan",
    "CN": "China",
    "BR": "Brazil",
    "ZA": "South Africa",
}

# Hierarchical location ID format: CC-STATE-WARD
LOCATION_ID_PATTERN = re.compile(r'^[A-Z]{2}(-[A-Z0-9]+)?(-[A-Z0-9]+)?$')

LAT_MIN, LAT_MAX = -90.0, 90.0
LNG_MIN, LNG_MAX = -180.0, 180.0

COORD_PRECISION = 6


class LocationValidationError(Exception):
    """Raised when location data fails validation."""
    pass


class CoordinateValidator:
    """Validates geographic coordinates with bounds checking."""
    
    @staticmethod
    def validate(lat: float, lng: float) -> Tuple[float, float]:
        """
        Validate and normalize coordinates.
        
        Args:
            lat: Latitude (-90 to 90)
            lng: Longitude (-180 to 180)
            
        Returns:
            Normalized (lat, lng) tuple
            
        Raises:
            LocationValidationError: If coordinates are invalid
        """
        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError) as e:
            raise LocationValidationError(f"Invalid coordinate type: {e}")
        
        if not (LAT_MIN <= lat <= LAT_MAX):
            raise LocationValidationError(
                f"Latitude {lat} out of bounds [{LAT_MIN}, {LAT_MAX}]"
            )
        
        if not (LNG_MIN <= lng <= LNG_MAX):
            raise LocationValidationError(
                f"Longitude {lng} out of bounds [{LNG_MIN}, {LNG_MAX}]"
            )
        
        # Normalize to 6 decimals (±0.111m precision)
        lat = round(lat, COORD_PRECISION)
        lng = round(lng, COORD_PRECISION)
        
        return lat, lng
    
    @staticmethod
    def to_decimal(lat: float, lng: float) -> Tuple[Decimal, Decimal]:
        """Convert validated coordinates to Decimal(9,6) for storage."""
        lat, lng = CoordinateValidator.validate(lat, lng)
        return Decimal(str(lat)), Decimal(str(lng))


class LocationIDValidator:
    """Validates hierarchical location IDs."""
    
    @staticmethod
    def validate(location_id: str) -> str:
        """
        Validate location ID format.
        
        Format examples:
        - NP (country level)
        - NP-KTM (country-city level)
        - NP-KTM-05 (country-city-ward level)
        
        Args:
            location_id: ID string
            
        Returns:
            Validated, uppercase location_id
            
        Raises:
            LocationValidationError: If format is invalid
        """
        if not isinstance(location_id, str):
            raise LocationValidationError(f"location_id must be string, got {type(location_id)}")
        
        location_id = location_id.upper().strip()
        
        if not location_id:
            raise LocationValidationError("location_id cannot be empty")
        
        if not LOCATION_ID_PATTERN.match(location_id):
            raise LocationValidationError(
                f"location_id '{location_id}' does not match pattern CC-STATE-WARD. "
                "Only uppercase letters, numbers, and hyphens allowed."
            )
        
        return location_id
    
    @staticmethod
    def extract_country_code(location_id: str) -> str:
        """Extract country code from location_id (first 2 chars)."""
        validated = LocationIDValidator.validate(location_id)
        return validated[:2]
    
    @staticmethod
    def get_hierarchy_level(location_id: str) -> int:
        """
        Get hierarchy level of location_id.
        
        - Level 1: NP (country)
        - Level 2: NP-KTM (country-city)
        - Level 3: NP-KTM-05 (country-city-ward)
        """
        validated = LocationIDValidator.validate(location_id)
        return validated.count('-') + 1


class CountryValidator:
    """Validates country codes and names."""
    
    @staticmethod
    def validate_code(country_code: str) -> str:
        """
        Validate ISO 3166-1 alpha-2 country code.
        
        Args:
            country_code: Two-letter country code
            
        Returns:
            Validated country code (uppercase)
            
        Raises:
            LocationValidationError: If code is invalid
        """
        if not isinstance(country_code, str):
            raise LocationValidationError(
                f"country_code must be string, got {type(country_code)}"
            )
        
        country_code = country_code.upper().strip()
        
        if len(country_code) != 2:
            raise LocationValidationError(
                f"country_code must be exactly 2 characters, got '{country_code}'"
            )
        
        if not country_code.isalpha():
            raise LocationValidationError(
                f"country_code must contain only letters, got '{country_code}'"
            )
        
        if country_code not in ISO_COUNTRIES:
            raise LocationValidationError(
                f"country_code '{country_code}' is not a valid ISO 3166-1 alpha-2 code"
            )
        
        return country_code
    
    @staticmethod
    def get_country_name(country_code: str) -> str:
        """Get English country name from code."""
        code = CountryValidator.validate_code(country_code)
        return ISO_COUNTRIES[code]
    
    @staticmethod
    def get_by_code(country_code: str) -> Dict[str, str]:
        """Get country info by code."""
        code = CountryValidator.validate_code(country_code)
        return {
            "country_code": code,
            "country_name": ISO_COUNTRIES[code]
        }


class LocationSchema:
    """
    Enforces the standard location format across the system.
    
    This is the single source of truth for location data structure.
    """
    
    @staticmethod
    def validate(location: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate complete location object.
        
        Required fields:
        - country_code (ISO 3166-1 alpha-2)
        - country_name (Full English name)
        - location_id (Hierarchical: NP-KTM-05)
        - lat, lng (Coordinates)
        
        Optional fields:
        - display_name (UI only, can be localized)
        
        Args:
            location: Location dictionary
            
        Returns:
            Validated and normalized location dictionary
            
        Raises:
            LocationValidationError: If validation fails
        """
        if not isinstance(location, dict):
            raise LocationValidationError(f"Location must be dict, got {type(location)}")
        
        # Validate required fields
        required = {"country_code", "country_name", "location_id", "lat", "lng"}
        missing = required - set(location.keys())
        if missing:
            raise LocationValidationError(f"Missing required fields: {missing}")
        
        # Validate and normalize each field
        validated = {}
        
        # Country
        validated["country_code"] = CountryValidator.validate_code(
            location["country_code"]
        )
        validated["country_name"] = CountryValidator.get_country_name(
            validated["country_code"]
        )
        
        # Verify country_code matches country_name
        if validated["country_name"] != location.get("country_name"):
            raise LocationValidationError(
                f"country_name mismatch: '{location.get('country_name')}' "
                f"does not match code '{validated['country_code']}' "
                f"which corresponds to '{validated['country_name']}'"
            )
        
        # Location ID
        validated["location_id"] = LocationIDValidator.validate(
            location["location_id"]
        )
        
        # Verify country code in location_id matches
        id_country_code = LocationIDValidator.extract_country_code(
            validated["location_id"]
        )
        if id_country_code != validated["country_code"]:
            raise LocationValidationError(
                f"location_id country '{id_country_code}' does not match "
                f"country_code '{validated['country_code']}'"
            )
        
        # Coordinates
        lat, lng = CoordinateValidator.validate(location["lat"], location["lng"])
        validated["lat"] = lat
        validated["lng"] = lng
        
        # Display name (optional, UI only)
        if "display_name" in location:
            display_name = str(location["display_name"]).strip()
            if not display_name:
                raise LocationValidationError("display_name cannot be empty")
            validated["display_name"] = display_name
        else:
            # Generate default display name if not provided
            validated["display_name"] = f"{validated['country_name']} ({validated['location_id']})"
        
        return validated
    
    @staticmethod
    def create(
        country_code: str,
        location_id: str,
        lat: float,
        lng: float,
        display_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a validated location object.
        
        Args:
            country_code: ISO country code (e.g., "NP")
            location_id: Hierarchical ID (e.g., "NP-KTM-05")
            lat: Latitude
            lng: Longitude
            display_name: Optional display name
            
        Returns:
            Validated location dictionary
        """
        country_name = CountryValidator.get_country_name(country_code)
        
        location = {
            "country_code": country_code,
            "country_name": country_name,
            "location_id": location_id,
            "lat": lat,
            "lng": lng,
        }
        
        if display_name:
            location["display_name"] = display_name
        
        return LocationSchema.validate(location)


class LocationMigrationHelper:
    """Helpers for migrating existing location data to the new format."""
    
    @staticmethod
    def migrate_event_location(
        lat: float,
        lng: float,
        venue_address: Optional[str] = None,
        country_code: str = "NP"
    ) -> Dict[str, Any]:
        """
        Migrate event location from old format.
        
        Old: venue_address, lat, lng
        New: Full location schema
        """
        location_id = LocationMigrationHelper._infer_location_id(lat, lng, country_code)
        
        return LocationSchema.create(
            country_code=country_code,
            location_id=location_id,
            lat=lat,
            lng=lng,
            display_name=venue_address or f"{country_code} Event Location"
        )
    
    @staticmethod
    def migrate_incident_location(
        lat: float,
        lng: float,
        location_name: Optional[str] = None,
        country_code: str = "NP"
    ) -> Dict[str, Any]:
        """
        Migrate incident/SOS location from old format.
        
        Old: location_name, lat, lng
        New: Full location schema
        """
        location_id = LocationMigrationHelper._infer_location_id(lat, lng, country_code)
        
        return LocationSchema.create(
            country_code=country_code,
            location_id=location_id,
            lat=lat,
            lng=lng,
            display_name=location_name or "Incident Location"
        )
    
    @staticmethod
    def _infer_location_id(lat: float, lng: float, country_code: str) -> str:
        """
        Infer location_id from coordinates and country.
        
        This is a temporary mapping for migration. In production,
        should use proper geocoding or geographic zone database.
        """
        # Simple mappings for Nepal (example)
        if country_code == "NP":
            if 27.7 <= lat <= 27.72 and 85.3 <= lng <= 85.35:
                return "NP-KTM-05"  # Kathmandu Ward 5 (example)
            elif 27.6 <= lat <= 27.8 and 85.2 <= lng <= 85.4:
                return "NP-KTM"  # Kathmandu
            else:
                return "NP"  # Nepal (default)
        
        return country_code


def sanitize_location_name(location_name: str) -> str:
    """
    Sanitize location_name to prevent XSS.
    
    This should be called when storing user-provided or API-provided
    location names to prevent script injection.
    """
    import html
    return html.escape(str(location_name).strip())
