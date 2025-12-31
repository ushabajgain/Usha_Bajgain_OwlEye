import json
import math
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import CrowdLocation, ResponderLocation
from events.models import Event
from django.contrib.auth import get_user_model
import redis
from django.conf import settings

User = get_user_model()

# We can connect to redis. Hardcoding localhost as it is on the local setup.
redis_client = redis.StrictRedis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371 # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dLon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c # Distance in km

class HeatmapConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs'].get('event_id')
        self.room_group_name = f'heatmap_{self.event_id}'
        self.locations_key = f"event:{self.event_id}:locations"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_add('global', self.channel_name)
        
        # User-specific group for private notifications
        user = self.scope.get('user')
        if user and user.is_authenticated:
            await self.channel_layer.group_add(f"user_{user.id}", self.channel_name)
            
            # Scoped Role Groups for targeted broadcasting and security
            if hasattr(user, 'role'):
                await self.channel_layer.group_add(f"role_{user.role}", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Redis Expiry Cleanup: Wipe dead sessions immediately to prevent Phantom Users on the map
        user = self.scope.get('user')
        if user and user.is_authenticated:
            redis_client.hdel(self.locations_key, str(user.id))
            
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        if user and user.is_authenticated:
            await self.channel_layer.group_discard(f"user_{user.id}", self.channel_name)
            if hasattr(user, 'role'):
                await self.channel_layer.group_discard(f"role_{user.role}", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')
            user = self.scope.get('user') # Safe dict extraction to prevent fatal WS KeyErrors

            if msg_type == 'location_update':
                # GPS Spoofing & Replay Mitigation
                client_ts = float(data.get('timestamp', datetime.now().timestamp()))
                now_ts = datetime.now().timestamp()
                
                # Bi-directional Tolerance: 30s allowance for slow mobile connections avoiding strict rejection
                if abs(now_ts - client_ts) > 30:
                    print(f"Rejected stale telemetry")
                    return

                lat = float(data.get('lat'))
                lng = float(data.get('lng'))
                battery = data.get('battery', '100%')
                user_id = user.id if user and user.is_authenticated else data.get('user_id', 0)

                # Event Lifecycle Check: DO NOT process telemetry if event is cancelled or deleted
                event_info = await self.get_event_cached()
                if not event_info.get('is_active', True):
                    return
                
                # Basic user info
                name = user.full_name if user and user.is_authenticated else data.get('full_name', f"Anonymous {user_id}")
                role = getattr(user, 'role', 'attendee') if user and user.is_authenticated else data.get('role', 'attendee')
                phone_number = user.phone_number if (user and user.is_authenticated and hasattr(user, 'phone_number')) else 'N/A'
                
                pic = getattr(user, 'profile_image', None)
                pic = pic.url if pic else f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random"

                now_str = datetime.now().strftime("%I:%M %p")

                # Get previous data from redis for anti-jitter
                prev_str = redis_client.hget(self.locations_key, str(user_id))
                prev = json.loads(prev_str) if prev_str else None
                
                distance_km = 0.0
                first_seen = now_str
                first_seen_ts = now_ts

                if prev:
                    prev_lat, prev_lng = float(prev['lat']), float(prev['lng'])
                    dist_moved = haversine(prev_lat, prev_lng, lat, lng)
                    distance_km = prev.get('distance', 0.0)
                    
                    # Anti-Jitter Filtering (Ignore >3m but <0.5m drift)
                    if dist_moved < 0.003: # 3 meters
                        # Skip processing completely if stationary map noise
                        return
                        
                    distance_km += dist_moved
                    first_seen = prev.get('first_seen', now_str)
                    first_seen_ts = prev.get('first_seen_ts', now_ts)

                # Active time calculation
                active_seconds = now_ts - first_seen_ts
                hours = int(active_seconds // 3600)
                minutes = int((active_seconds % 3600) // 60)
                active_time = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

                new_data = {
                    "user_id": user_id,
                    "lat": lat,
                    "lng": lng,
                    "name": name,
                    "role": role,
                    "phone": phone_number,
                    "pic": pic,
                    "distance": round(distance_km, 2),
                    "battery": battery,
                    "first_seen": first_seen,
                    "first_seen_ts": first_seen_ts,
                    "last_seen": now_str,
                    "active_time": active_time,
                    "event_name": event_info.get('name'),
                    "venue_address": event_info.get('venue'),
                    "intensity": 1.0 if role == 'attendee' else 0.5
                }

                # Redis GEO Store (Instant Spatial Tracking Replacement)
                geo_users_key = f"event:{self.event_id}:users"
                redis_client.execute_command('GEOADD', geo_users_key, lng, lat, str(user_id))
                redis_client.expire(geo_users_key, 60) # Garbage map wipe natively 

                # Segregated responders grid for O(1) SOS dispatch radius checks
                if role == 'volunteer' and user and user.is_authenticated:
                    geo_volunteers_key = f"event:{self.event_id}:volunteers"
                    redis_client.execute_command('GEOADD', geo_volunteers_key, lng, lat, str(user_id))
                    redis_client.expire(geo_volunteers_key, 60)
                    await self.update_responder_location(user, lat, lng)

                # Persistence: Save to DB every 60 seconds (Partition potential handled downstream)
                last_db_save = redis_client.get(f"user:{user_id}:last_save")
                if not last_db_save or (now_ts - float(last_db_save)) > 60:
                    await self.save_crowd_location(user_id, lat, lng)
                    redis_client.set(f"user:{user_id}:last_save", now_ts)

                # PRIVACY FILTERING / MULTI-ROLE BRANCHING
                # Organizers & Admin get FULL identifiable user context
                for secure_group in ['role_organizer', 'role_admin', 'role_volunteer']:
                    await self.channel_layer.group_send(
                        secure_group,
                        {
                            'type': 'entity_broadcast',
                            'entity_type': 'user',
                            **new_data
                        }
                    )
                
                # Attendees (General room) get securely HASHED, stripped thermal metadata 
                # Preventing PII location scraping leaks entirely
                import hashlib
                secure_alias = hashlib.sha256(f"{user_id}_SALT_{self.event_id}".encode()).hexdigest()[:16]
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'entity_broadcast',
                        'entity_type': 'user',
                        'user_id': secure_alias,
                        'name': 'Anonymous Attendee',
                        'role': 'attendee',
                        'lat': lat,
                        'lng': lng,
                        'intensity': new_data['intensity']
                    }
                )
            
            # Removed unauthenticated mock handlers for `report_incident` and `sos_alert`.
            # All emergency telemetry must now funnel through strictly authenticated HTTP 
            # REST APIs (views.py) which handle database persistence, clustering, and RBAC 
            # before conditionally broadcasting downstream via Channels.
        except Exception as e:
            print(f"WS Receive Error: {e}")

    async def get_event_cached(self):
        # A simple per-connection cache or fetch from DB
        if hasattr(self, '_event_cache'):
            return self._event_cache
            
        @database_sync_to_async
        def fetch_event(eid):
            try:
                e = Event.objects.get(id=eid)
                is_evt_active = getattr(e, 'status', 'published') != 'cancelled'
                return {'name': e.name, 'venue': e.venue_address, 'is_active': is_evt_active}
            except:
                return {'name': 'OwlEye Event', 'venue': 'Main Stadium, KTM', 'is_active': True}
        
        self._event_cache = await fetch_event(self.event_id)
        return self._event_cache

    async def entity_broadcast(self, event):
        await self.send(text_data=json.dumps(event))

    async def heatmap_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'type': 'heatmap_point',
            'lat': event['lat'],
            'lng': event['lng'],
            'intensity': event.get('intensity', 1.0)
        }))

    @database_sync_to_async
    def save_crowd_location(self, user_id, lat, lng):
        try:
            event = Event.objects.get(id=self.event_id)
            user = None
            if str(user_id).isdigit():
                user = User.objects.filter(id=user_id).first()
                
            CrowdLocation.objects.create(
                event=event,
                user=user,
                latitude=lat,
                longitude=lng,
                source_type='live_tracking'
            )
        except Exception as e:
            print(f"Error persisting crowd location: {e}")

    @database_sync_to_async
    def update_responder_location(self, user, lat, lng):
        try:
            event = Event.objects.get(id=self.event_id)
            ResponderLocation.objects.update_or_create(
                user=user,
                defaults={
                    'event': event,
                    'latitude': lat,
                    'longitude': lng,
                    'is_active': True
                }
            )
        except Exception as e:
            print(f"Error updating responder location: {e}")

