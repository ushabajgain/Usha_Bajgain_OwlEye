from rest_framework import serializers
from .models import Incident, SOSAlert, CrowdLocation, SafetyAlert, ResponderLocation, IncidentLog, SOSLog, Notification

class IncidentSerializer(serializers.ModelSerializer):
    reporter_name = serializers.ReadOnlyField(source='reporter.full_name')
    volunteer_name = serializers.ReadOnlyField(source='assigned_volunteer.full_name')
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_flagged_reporter = serializers.BooleanField(source='reporter.is_flagged', read_only=True)
    reporter_false_count = serializers.IntegerField(source='reporter.false_report_count', read_only=True)
    
    # Linked reports for clustering
    linked_count = serializers.IntegerField(source='linked_reports.count', read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'event', 'reporter', 'reporter_name', 'assigned_volunteer', 
            'volunteer_name', 'category', 'category_display', 'priority', 
            'title', 'description', 'location_data', 'latitude', 'longitude', 'gps_accuracy', 
            'location_name', 'status', 'status_display', 'parent_incident', 
            'is_active', 'created_at', 'verified_at', 'resolved_at', 'closed_at',
            'is_flagged_reporter', 'reporter_false_count', 'linked_count'
        ]
        read_only_fields = ['reporter', 'created_at', 'verified_at', 'resolved_at', 'closed_at', 'is_active']

class SOSAlertSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.full_name')
    assigned_volunteer_name = serializers.ReadOnlyField(source='assigned_volunteer.full_name')
    sos_type_display = serializers.CharField(source='get_sos_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'event', 'user', 'user_name', 'location_data', 'latitude', 'longitude', 'gps_accuracy', 
            'location_name', 'sos_type', 'sos_type_display', 'status', 'status_display', 
            'priority', 'assigned_volunteer', 'assigned_volunteer_name', 'is_active', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['user', 'created_at', 'resolved_at']

class SafetyAlertSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.full_name')
    event_name = serializers.ReadOnlyField(source='event.name')
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    audience_display = serializers.CharField(source='get_audience_type_display', read_only=True)

    class Meta:
        model = SafetyAlert
        fields = [
            'id', 'event', 'event_name', 'creator', 'creator_name', 'title', 'message', 
            'severity', 'severity_display', 'audience_type', 'audience_display',
            'latitude', 'longitude', 'radius_meters', 'is_active', 
            'created_at', 'expires_at'
        ]
        read_only_fields = ['creator', 'created_at']

class ResponderLocationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.full_name')
    user_role = serializers.ReadOnlyField(source='user.role')
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ResponderLocation
        fields = [
            'id', 'user', 'user_name', 'user_role', 'event', 
            'latitude', 'longitude', 'status', 'status_display', 
            'last_updated', 'is_active'
        ]
        read_only_fields = ['user', 'last_updated']

class IncidentLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.ReadOnlyField(source='performed_by.full_name')
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = IncidentLog
        fields = '__all__'

class SOSLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.ReadOnlyField(source='performed_by.full_name')
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = SOSLog
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    created_at_display = serializers.DateTimeField(source='created_at', format='%I:%M %p', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'event', 'title', 'message', 'notification_type', 
            'notification_type_display', 'is_read', 'created_at', 'created_at_display',
            'priority', 'entity_type', 'entity_id', 'delivered_at', 'expires_at'
        ]
        read_only_fields = ['user', 'created_at']
