from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Event, Ticket, Incident, SOSAlert

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'full_name', 'role', 'phone_number', 'account_status']
        read_only_fields = ['id', 'email', 'role']

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 'full_name', 'role', 'phone_number']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=validated_data.get('role', 'ATTENDEE'),
            phone_number=validated_data.get('phone_number', '')
        )
        return user

class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    is_joined = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'category', 
            'location_lat', 'location_lng', 'address', 
            'start_date', 'end_date', 'capacity', 'current_attendance',
            'status', 'organizer', 'organizer_name', 'is_joined',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organizer', 'current_attendance', 'created_at', 'updated_at']

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return Ticket.objects.filter(event=obj, user=request.user).exists()
        return False

class TicketSerializer(serializers.ModelSerializer):
    """
    Serializer for Ticket details.
    """
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_start_date = serializers.DateTimeField(source='event.start_date', read_only=True)
    event_address = serializers.CharField(source='event.address', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'event_title', 'event_start_date', 'event_address',
            'user', 'user_full_name', 'qr_token', 'status', 'scan_timestamp', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'qr_token', 'status', 'scan_timestamp', 'created_at']

class IncidentSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.full_name', read_only=True)
    assigned_volunteer_name = serializers.CharField(source='assigned_volunteer.full_name', read_only=True)
    
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ['id', 'reporter', 'created_at', 'updated_at', 'resolved_at']

class SOSAlertSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = SOSAlert
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'resolved_at']

class LiveMapEntitySerializer(serializers.Serializer):
    """
    Polymorphic-like serializer for map entities.
    """
    id = serializers.CharField()
    type = serializers.CharField() # attendee, volunteer, organizer, incident, sos
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    label = serializers.CharField(required=False)
    severity = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    timestamp = serializers.DateTimeField()
