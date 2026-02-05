from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import Event, Ticket

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    """
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'full_name', 'phone_number', 'role', 'account_status')
        read_only_fields = ('id', 'account_status')


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'full_name', 'password', 'confirm_password', 'role', 'phone_number')
        extra_kwargs = {
            'username': {'required': True},
            'role': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            role=validated_data.get('role', 'ATTENDEE'),
            phone_number=validated_data.get('phone_number', '')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for Event creation and viewing.
    """
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
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return Ticket.objects.filter(event=obj, user=user).exists()
        return False

    def validate(self, data):
        """
        Check that start_date is before end_date.
        """
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return data


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
