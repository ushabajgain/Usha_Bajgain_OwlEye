import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Event, CrowdLocation

class AttendanceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'attendance_{self.event_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def attendance_update(self, event):
        await self.send(text_data=json.dumps({
            'current_attendance': event['current_attendance'],
            'capacity': event['capacity']
        }))


class HeatmapConsumer(AsyncWebsocketConsumer):
    """
    Consumer for broadcasting heatmap data to organizers and authorities.
    """
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'heatmap_{self.event_id}'

        # TODO: Add role check (Organizer/Authority only)
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        # Allow manual refresh request if needed
        pass

    async def heatmap_update(self, event):
        """
        Receives aggregated density data from the channel layer and sends it to the client.
        """
        await self.send(text_data=json.dumps({
            'type': 'heatmap_data',
            'points': event['points'], # Array of [lat, lng, intensity]
            'timestamp': str(timezone.now())
        }))


class LiveMapConsumer(AsyncWebsocketConsumer):
    """
    Consumer for the live clustered map. 
    Sends updates for users, volunteers, incidents, and SOS alerts.
    """
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'live_map_{self.event_id}'
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def entity_update(self, event):
        """
        Receives an entity update and sends it to the client.
        """
        await self.send(text_data=json.dumps(event['entity']))


class BroadcastConsumer(AsyncWebsocketConsumer):
    """
    Consumer for receiving broadcasted safety alerts and notifications.
    Attendees/Volunteers connect here for real-time updates.
    """
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'broadcast_{self.event_id}'
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def safety_alert(self, event):
        """
        Receives a safety alert and sends it to the client.
        """
        await self.send(text_data=json.dumps({
            'type': 'safety_alert',
            'alert': event['alert']
        }))


class LocationTrackConsumer(AsyncWebsocketConsumer):
    """
    Consumer for attendees to send their live location updates.
    """
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        data = json.loads(text_data)
        lat = data.get('lat')
        lng = data.get('lng')

        if lat and lng:
            # Save location to DB
            await self.save_location(lat, lng)
            
            # 1. Notify Heatmap group
            await self.channel_layer.group_send(
                f'heatmap_{self.event_id}',
                {
                    'type': 'heatmap_update',
                    'points': [[lat, lng, 0.5]]
                }
            )

            # 2. Notify Live Map group with role info
            user = self.scope['user']
            role = user.role if user.is_authenticated else 'ATTENDEE'
            
            entity_data = {
                'id': str(user.id) if user.is_authenticated else 'anon',
                'type': role.lower(),
                'lat': lat,
                'lng': lng,
                'label': user.full_name if user.is_authenticated else 'Attendee',
                'timestamp': str(timezone.now())
            }

            await self.channel_layer.group_send(
                f'live_map_{self.event_id}',
                {
                    'type': 'entity_update',
                    'entity': entity_data
                }
            )

    @database_sync_to_async
    def save_location(self, lat, lng):
        user = self.scope['user'] if self.scope['user'].is_authenticated else None
        event = Event.objects.get(id=self.event_id)
        return CrowdLocation.objects.create(
            event=event,
            user=user,
            lat=lat,
            lng=lng,
            source='LIVE'
        )

    # This handles the message from channel layer if the heatmap group sends something back
    async def new_location_point(self, event):
        pass
