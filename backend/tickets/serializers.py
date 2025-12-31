from rest_framework import serializers
from .models import Ticket, TicketOrder
from events.serializers import EventSerializer, TicketPackageSerializer

class TicketSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    user_name = serializers.SerializerMethodField()
    package_details = TicketPackageSerializer(source='package', read_only=True)
    order_id = serializers.ReadOnlyField(source='order.id')

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['id', 'user', 'qr_token', 'status', 'scanned_at', 'created_at']

    def get_user_name(self, obj):
        if obj.order:
            return f"{obj.order.first_name} {obj.order.last_name}"
        return obj.user.full_name

class TicketOrderSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)
    event_name = serializers.ReadOnlyField(source='event.name')

    class Meta:
        model = TicketOrder
        fields = '__all__'
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']
