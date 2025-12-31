from rest_framework import serializers
from .models import Event, TicketPackage, EventLike
from django.utils import timezone


class TicketPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketPackage
        fields = ['id', 'name', 'price', 'description', 'perks', 'seating_type', 'color', 'sort_order']


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.ReadOnlyField(source='organizer.full_name')
    attendee_count = serializers.SerializerMethodField()
    ticket_packages = TicketPackageSerializer(many=True, read_only=True)
    is_past = serializers.SerializerMethodField()
    is_sold_out = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['id', 'organizer', 'created_at', 'updated_at']

    def get_attendee_count(self, obj):
        return obj.tickets.filter(status__in=['issued', 'scanned']).count()

    def get_is_past(self, obj):
        return obj.end_datetime < timezone.now()

    def get_is_sold_out(self, obj):
        return self.get_attendee_count(obj) >= obj.capacity

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def validate(self, data):
        """
        Check that the start date is before the end date.
        """
        if 'start_datetime' in data and 'end_datetime' in data:
            if data['start_datetime'] >= data['end_datetime']:
                raise serializers.ValidationError({"end_datetime": "End date must be after start date."})

            pass

        # Duplicate check: Name + Start Date + Venue
        if 'name' in data and 'start_datetime' in data and 'venue_address' in data:
            exists = Event.objects.filter(
                name=data['name'],
                start_datetime=data['start_datetime'],
                venue_address=data['venue_address']
            ).exclude(pk=self.instance.pk if self.instance else None).exists()
            if exists:
                raise serializers.ValidationError({"non_field_errors": ["An event with this name, date, and venue already exists."]})

        if 'capacity' in data and data['capacity'] <= 0:
            raise serializers.ValidationError({"capacity": "Capacity must be greater than zero."})

        return data
