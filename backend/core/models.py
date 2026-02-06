"""
Core Models

Data models for the OwlEye platform.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import uuid

class User(AbstractUser):
    """
    Custom User model for OwlEye with role-based access control.
    """
    class Role(models.TextChoices):
        ATTENDEE = 'ATTENDEE', 'Attendee'
        ORGANIZER = 'ORGANIZER', 'Organizer'
        VOLUNTEER = 'VOLUNTEER', 'Volunteer'
        AUTHORITY = 'AUTHORITY', 'Authority'

    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.ATTENDEE
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    account_status = models.CharField(max_length=20, default='active')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    def __str__(self):
        return f"{self.email} ({self.role})"


class Event(models.Model):
    """
    Event entity for managing public events.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Category(models.TextChoices):
        CONCERT = 'CONCERT', 'Concert'
        CONFERENCE = 'CONFERENCE', 'Conference'
        SPORTS = 'SPORTS', 'Sports'
        FESTIVAL = 'FESTIVAL', 'Festival'
        RALLY = 'RALLY', 'Rally'
        OTHER = 'OTHER', 'Other'

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=20, 
        choices=Category.choices, 
        default=Category.OTHER
    )
    
    # Location Data
    location_lat = models.FloatField(help_text="Latitude")
    location_lng = models.FloatField(help_text="Longitude")
    address = models.CharField(max_length=255, help_text="Venue Address")
    
    # Timing & Capacity
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    capacity = models.PositiveIntegerField()
    current_attendance = models.PositiveIntegerField(default=0, help_text="Real-time check-in count")
    
    # Metadata
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='events'
    )
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

class Ticket(models.Model):
    """
    Ticket entity linking User and Event with QR Code.
    """
    class Status(models.TextChoices):
        ISSUED = 'ISSUED', 'Issued'
        SCANNED = 'SCANNED', 'Scanned'
        INVALIDATED = 'INVALIDATED', 'Invalidated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    qr_token = models.CharField(max_length=100, unique=True, editable=False)
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.ISSUED
    )
    scan_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'user') # One ticket per user per event

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket {self.id} - {self.user.email}"

class CrowdLocation(models.Model):
    """
    Real-time location data points for heatmap generation.
    """
    class Source(models.TextChoices):
        SCAN = 'SCAN', 'Ticket Scan'
        LIVE = 'LIVE', 'Live Tracking'
        MANUAL = 'MANUAL', 'Manual Log'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='crowd_locations')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='location_logs')
    lat = models.FloatField()
    lng = models.FloatField()
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.LIVE)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'timestamp']),
            models.Index(fields=['lat', 'lng']),
        ]

    def __str__(self):
        return f"Loc for Event {self.event.id} at {self.timestamp}"

class Incident(models.Model):
    """
    Reported incidents during an event.
    """
    class Category(models.TextChoices):
        FIRE = 'FIRE', 'Fire'
        MEDICAL = 'MEDICAL', 'Medical Emergency'
        VIOLENCE = 'VIOLENCE', 'Violence/Conflict'
        STAMPEDE = 'STAMPEDE', 'Stampede Risk'
        SUSPICIOUS = 'SUSPICIOUS', 'Suspicious Activity'
        LOST_PERSON = 'LOST_PERSON', 'Lost Person'
        TECH_FAILURE = 'TECH_FAILURE', 'Technical/Infra Failure'
        OTHER = 'OTHER', 'Other'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class Status(models.TextChoices):
        REPORTED = 'REPORTED', 'Reported'
        INVESTIGATING = 'INVESTIGATING', 'Investigating'
        RESOLVED = 'RESOLVED', 'Resolved'
        FALSE_ALARM = 'FALSE_ALARM', 'False Alarm'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='incidents')
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reported_incidents')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True, null=True)
    lat = models.FloatField()
    lng = models.FloatField()
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REPORTED)
    assigned_volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'severity']),
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"{self.category} ({self.severity}) - {self.status}"

class IncidentLog(models.Model):
    """
    Audit trail for transparency and historical analysis of an incident.
    """
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='action_logs')
    action_type = models.CharField(max_length=50) # Reported, Verified, Assigned, Resolved, etc.
    previous_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20)
    notes = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['incident', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.action_type} on {self.incident.id} at {self.timestamp}"

class SOSLog(models.Model):
    """
    Audit trail for SOS alerts.
    """
    sos_alert = models.ForeignKey('SOSAlert', on_delete=models.CASCADE, related_name='logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sos_action_logs')
    action_type = models.CharField(max_length=50) # Triggered, Acknowledged, Resolved
    notes = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['sos_alert', 'timestamp']),
        ]

class SOSAlert(models.Model):
    """
    Emergency SOS alerts triggered by users.
    """
    class Type(models.TextChoices):
        PANIC = 'PANIC', 'Panic / Distress'
        MEDICAL = 'MEDICAL', 'Medical Emergency'
        THREAT = 'THREAT', 'Security Threat'
        TRAPPED = 'TRAPPED', 'Trapped/Crowd Crush'
        UNKNOWN = 'UNKNOWN', 'Unknown Emergency'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'
        RESOLVED = 'RESOLVED', 'Resolved'

    class Priority(models.TextChoices):
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='sos_alerts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='my_sos_alerts')
    lat = models.FloatField()
    lng = models.FloatField()
    sos_type = models.CharField(max_length=20, choices=Type.choices, default=Type.PANIC)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.CRITICAL)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"SOS ({self.sos_type}) by {self.user.email} at {self.created_at}"

class SafetyAlert(models.Model):
    """
    Broadcasted alerts and emergency instructions for event attendees.
    """
    class Severity(models.TextChoices):
        INFO = 'INFO', 'Information'
        WARNING = 'WARNING', 'Warning'
        DANGER = 'DANGER', 'Danger'
        EMERGENCY = 'EMERGENCY', 'Critical Emergency'

    class Audience(models.TextChoices):
        ALL = 'ALL', 'All Attendees'
        VOLUNTEERS = 'VOLUNTEERS', 'Volunteers Only'
        ZONE = 'ZONE', 'Specific Zone'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='safety_alerts')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_alerts')
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=15, choices=Severity.choices, default=Severity.INFO)
    audience_type = models.CharField(max_length=15, choices=Audience.choices, default=Audience.ALL)
    
    # Geo-fencing (Optional)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    radius_meters = models.PositiveIntegerField(null=True, blank=True)
    
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.severity}: {self.title} ({self.event.title})"

class ResponderLocation(models.Model):
    """
    Real-time high-accuracy tracking for staff, volunteers, and responders.
    """
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        BUSY = 'BUSY', 'Busy'
        RESPONDING = 'RESPONDING', 'Responding'
        OFFLINE = 'OFFLINE', 'Offline'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='responder_locations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='staff_positions')
    lat = models.FloatField()
    lng = models.FloatField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.AVAILABLE)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'event')
        indexes = [
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.status} at {self.last_updated}"
