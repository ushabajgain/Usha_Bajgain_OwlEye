import requests
from django.utils import timezone
from .models import IncidentLog, SOSLog
from monitoring.locations import LocationSchema, CoordinateValidator, CountryValidator, LocationIDValidator

def log_incident_action(incident, action_type, performed_by=None, previous_status=None, new_status=None, notes=None):
    return IncidentLog.objects.create(
        incident=incident,
        action_type=action_type,
        performed_by=performed_by,
        previous_status=previous_status,
        new_status=new_status,
        notes=notes
    )

def log_sos_action(sos_alert, action_type, performed_by=None, previous_status=None, new_status=None, notes=None):
    return SOSLog.objects.create(
        sos_alert=sos_alert,
        action_type=action_type,
        performed_by=performed_by,
        previous_status=previous_status,
        new_status=new_status,
        notes=notes
    )

# In-memory cache for geocoding to prevent hitting rate limits
GEOCACHE = {}  # Clear cache on every restart

def reverse_geocode(lat, lon):
    """
    Converts GPS coordinates (lat, lon) into a human-readable location name
    using OpenStreetMap (Nominatim).
    Returns format: "City-Ward, Country" in English
    """
    if lat is None or lon is None:
        return "Unknown Location"
        
    # Round to 4 decimal places (~11m precision) for cache hits
    cache_key = (round(float(lat), 4), round(float(lon), 4))
    if cache_key in GEOCACHE:
        cached = GEOCACHE[cache_key]
        print(f"[GEOCODE] Cache hit for ({lat}, {lon}): {cached}")
        return cached
        
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1&accept-language=en"
        headers = {
            'User-Agent': 'OwlEyeApp/1.0 (support@owleye.com)'
        }
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        
        print(f"[GEOCODE] API response address: {data.get('address', {})}")
        
        if 'address' in data:
            addr = data.get('address', {})
            
            country = addr.get('country', 'Nepal')
            print(f"[GEOCODE] Country: {country}")
            
            # Try to extract English names (Nominatim with accept-language=en)
            # Look for ward/suburb/neighbourhood first (most specific)
            ward = addr.get('suburb') or addr.get('neighbourhood') or addr.get('city_district')
            
            # Then city/town/village
            city = addr.get('city') or addr.get('town') or addr.get('village')
            
            print(f"[GEOCODE] Ward: {ward}, City: {city}")
            
            # Pick the best location name
            location_part = ward or city or "Unknown"
            
            # Strip everything after and including the country name (in case it's included)
            # This handles cases where Nominatim returns "Ward, Nepal" or "City, Nepal"
            location_clean = location_part
            
            for pattern in [f", {country}", f",{country}"]:
                if location_clean.endswith(pattern):
                    location_clean = location_clean[:-len(pattern)].strip()
                    break
            
            # Also remove any trailing commas
            location_clean = location_clean.rstrip(',').strip()
            
            result = f"{location_clean}, {country}"
            
            print(f"[GEOCODE] Final result: {result}")
            GEOCACHE[cache_key] = result
            return result
            
        return "Unknown Location"
    except Exception as e:
        print(f"[GEOCODE] Error: {e}")
        return "Unknown Location"


def infer_country_code(lat, lng):
    """
    Infer country code from coordinates.
    
    Currently supports Nepal (26.0 to 30.5 lat, 80.0 to 88.2 lng).
    Falls back to None if country cannot be determined.
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        Country code (e.g., "NP") or None
    """
    lat = float(lat)
    lng = float(lng)
    
    # Nepal bounds: 26.0°N to 30.5°N latitude, 80.0°E to 88.2°E longitude
    if 26.0 <= lat <= 30.5 and 80.0 <= lng <= 88.2:
        return "NP"
    
    # Add more countries as needed
    # if ...: return "IN"
    # if ...: return "BD"
    
    return None


def generate_location_id(country_code, display_name):
    """
    Generate hierarchical location_id from country code and display name.
    
    Format: CC-STATE-WARD (e.g., NP-KTM-05)
    
    Args:
        country_code: ISO country code (e.g., "NP")
        display_name: Human-readable location (e.g., "Tinkune, Kathmandu")
        
    Returns:
        location_id string
    """
    if not country_code or not display_name:
        return country_code or "XX"
    
    # Extract city/state and ward from display_name
    # Format: "Ward X, City" or "Neighborhood, City"
    parts = [p.strip() for p in display_name.split(',')]
    
    # Build location_id: CC-CITY or CC-CITY-WARD
    location_parts = [country_code]
    
    if len(parts) >= 2:
        # parts[1] is city/state
        city = parts[1].upper().replace(" ", "")[:3]  # First 3 letters
        location_parts.append(city)
        
        if len(parts) >= 1:
            # Try to extract ward number from first part
            first_part = parts[0]
            import re
            ward_match = re.search(r'\d+', first_part)
            if ward_match:
                ward = f"{int(ward_match.group()):02d}"
                location_parts.append(ward)
    
    return '-'.join(location_parts)


def enrich_location(lat, lng, gps_accuracy=None):
    """
    CRITICAL: Backend-only location enrichment.
    
    Converts raw GPS coordinates into fully structured location_data.
    This is the SINGLE SOURCE OF TRUTH for location enrichment.
    
    Frontend must NEVER do this - it has no authority to:
    - Determine country
    - Generate location_id
    - Infer location hierarchy
    
    Args:
        lat: Latitude (required)
        lng: Longitude (required)
        gps_accuracy: Optional accuracy radius in meters
        
    Returns:
        Validated location_data dictionary:
        {
            "country_code": "NP",
            "country_name": "Nepal",
            "location_id": "NP-KTM-05",
            "display_name": "Tinkune, Kathmandu",
            "lat": 27.7172,
            "lng": 85.3240
        }
        
    Raises:
        Exception: If coordinates are invalid or country cannot be determined
    """
    # 1. Validate coordinates
    try:
        lat, lng = CoordinateValidator.validate(lat, lng)
    except Exception as e:
        raise Exception(f"Invalid coordinates: {e}")
    
    # 2. Determine country (backend authority)
    country_code = infer_country_code(lat, lng)
    if not country_code:
        raise Exception(
            f"Location ({lat}, {lng}) is outside supported regions. "
            "Currently only Nepal (NP) is supported."
        )
    
    # 3. Get country name
    try:
        country_name = CountryValidator.get_country_name(country_code)
    except Exception as e:
        raise Exception(f"Invalid country code: {e}")
    
    # 4. Get human-readable location name via reverse geocoding
    display_name = reverse_geocode(lat, lng)
    
    # 5. Generate hierarchical location_id
    location_id = generate_location_id(country_code, display_name)
    
    # 6. Validate location_id format
    try:
        location_id = LocationIDValidator.validate(location_id)
    except Exception as e:
        # Fallback to country-only if validation fails
        location_id = country_code
    
    # 7. Build and validate full location_data
    location = {
        "country_code": country_code,
        "country_name": country_name,
        "location_id": location_id,
        "display_name": display_name,
        "lat": lat,
        "lng": lng,
    }
    
    # 8. Final validation via LocationSchema
    try:
        validated = LocationSchema.validate(location)
        return validated
    except Exception as e:
        raise Exception(f"Location enrichment failed: {e}")


def send_notification(user, title, message, notification_type, event=None, priority='normal', entity_type=None, entity_id=None):
    from .models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    # 1. Create DB record
    notif = Notification.objects.create(
        user=user,
        event=event,
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        entity_type=entity_type,
        entity_id=entity_id
    )

    # 2. Broadcast to WebSocket group for this specific user
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            group = f"user_{user.id}"
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'notification',
                    'id': notif.id,
                    'title': notif.title,
                    'message': notif.message,
                    'notification_type': notif.notification_type,
                    'priority': notif.priority,
                    'src_type': notif.entity_type,
                    'src_id': notif.entity_id,
                    'created_at': notif.created_at.strftime("%I:%M %p"),
                    'is_read': notif.is_read
                }
            )
            # Reliable messaging delivery stamp
            notif.delivered_at = timezone.now()
            notif.save(update_fields=['delivered_at'])
    except Exception as e:
        print(f"WS Broadcast failed for notification: {e}")

    return notif

def push_group_notification(group_name, title, message, notification_type='broadcast', priority='normal'):
    """
    Rapid-fires an alert into an entire Websocket Group (e.g., 'event_12' or 'role_organizer')
    without needing to query and loop individually, unlocking O(1) broadcast scalability.
    NOTE: Users must fetch missed historical broadcasts via REST on reconnection.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'notification',
                    'title': title,
                    'message': message,
                    'notification_type': notification_type,
                    'priority': priority,
                    'created_at': timezone.now().strftime("%I:%M %p"),
                    'is_read': False
                }
            )
    except Exception as e:
        print(f"WS Broadcast to group '{group_name}' failed: {e}")

def send_notification_to_event(event, title, message, priority='normal'):
    """Broadcasts a severe emergency overlay to ALL users watching a specific Event."""
    # Also optionally sync to the DB in bulk if needed, but the primary strength is the direct WebSocket push.
    push_group_notification(f"heatmap_{event.id}", title, message, 'broadcast', priority)

def send_notification_to_role(role, title, message, notification_type='system', priority='normal', event=None):
    """Directly alarms an entire role class (e.g. all volunteers) instantaneously."""
    push_group_notification(f"role_{role}", title, message, notification_type, priority)
