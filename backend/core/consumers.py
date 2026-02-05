import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AttendanceConsumer(AsyncWebsocketConsumer):
    async keen_connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'attendance_{self.event_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from room group
    async attendance_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'current_attendance': event['current_attendance'],
            'capacity': event['capacity']
        }))

    async connect(self):
        await self.keen_connect()
