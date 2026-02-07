from django.db import models
from events.models import Event
from django.conf import settings

class CrowdLocation(models.Model):
    SOURCE_CHOICES = (
        ('ticket_scan', 'Ticket Scan'),
        ('live_tracking', 'Live Tracking'),
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='crowd_locations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'timestamp']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def __str__(self):
        return f"Location at {self.latitude}, {self.longitude} for {self.event.name}"

class Incident(models.Model):
    CATEGORY_CHOICES = (
        ('fire', 'Fire'),
        ('medical', 'Medical Emergency'),
        ('violence', 'Violence/Conflict'),
        ('stampede', 'Stampede Risk'),
        ('suspicious', 'Suspicious Activity'),
        ('lost_person', 'Lost Person'),
        ('technical', 'Technical/Infrastructure Failure'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('responding', 'Responding'),
        ('resolved', 'Resolved'),
        ('false_alarm', 'False Alarm'),
        ('duplicate', 'Duplicate Report'),
        ('rejected', 'Rejected'),
        ('closed', 'Closed/Archived'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='incidents')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reported_incidents')
    assigned_volunteer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    
    # For Clustering multiple reports of the same incident
    parent_incident = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='linked_reports')
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Structured location (NEW - Primary)
    location_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Structured location: {country_code, country_name, location_id, display_name, lat, lng}"
    )
    
    # Legacy fields (denormalized from location_data for backward compatibility)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="DEPRECATED: Use location_data instead"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="DEPRECATED: Use location_data instead"
    )
    gps_accuracy = models.FloatField(null=True, blank=True, help_text="Accuracy radius in meters")
    location_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="DEPRECATED: Use location_data.display_name instead"
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    confidence_score = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    # Lifecycle Timestamps for Analytics/SLA
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['priority']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        """Sync denormalized fields from location_data."""
        if self.location_data:
            self.latitude = self.location_data.get('lat')
            self.longitude = self.location_data.get('lng')
            self.location_name = self.location_data.get('display_name', '')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_category_display()} - {self.status}"


class SOSAlert(models.Model):
    TYPE_CHOICES = (
        ('panic', 'Panic / General Help'),
        ('medical', 'Medical Emergency'),
        ('threat', 'Security Threat'),
        ('trapped', 'Trapped / Crowded'),
        ('unknown', 'Unknown / Silent'),
    )
    STATUS_CHOICES = (
        ('reported', 'Reported'),
        ('assigned', 'Assigned to Responder'),
        ('in_progress', 'Help In Progress'),
        ('completed', 'Completed'),
        ('resolved', 'Resolved'),
        ('cancelled', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('high', 'High'),
        ('critical', 'Critical'),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='sos_alerts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sos_alerts')
    
    # Structured location (NEW - Primary)
    location_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Structured location: {country_code, country_name, location_id, display_name, lat, lng}"
    )
    
    # Legacy fields (denormalized from location_data for backward compatibility)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="DEPRECATED: Use location_data instead"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="DEPRECATED: Use location_data instead"
    )
    gps_accuracy = models.FloatField(null=True, blank=True, help_text="Accuracy radius in meters")
    location_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="DEPRECATED: Use location_data.display_name instead"
    )
    sos_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='panic')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='critical')
    assigned_volunteer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_sos')
    is_active = models.BooleanField(default=True)
    is_read = models.BooleanField(default=False, help_text="Has the organizer/admin acknowledged this SOS alert")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)  # NEW: Track completion time
    resolved_at = models.DateTimeField(null=True, blank=True)  # Legacy field

    class Meta:
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        """Sync denormalized fields from location_data."""
        if self.location_data:
            self.latitude = self.location_data.get('lat')
            self.longitude = self.location_data.get('lng')
            self.location_name = self.location_data.get('display_name', '')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"SOS [{self.get_sos_type_display()}] from {self.user.email}"

class SafetyAlert(models.Model):
    SEVERITY_CHOICES = (
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('danger', 'High Danger'),
        ('emergency', 'Critical Emergency'),
    )
    AUDIENCE_CHOICES = (
        ('all', 'All Attendees'),
        ('volunteers', 'Volunteers Only'),
        ('zone', 'Specific Zone'),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='safety_alerts', null=True, blank=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    audience_type = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    
    # Geo-targeting (optional)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius_meters = models.IntegerField(default=0) # 0 means no radius check
    
    # Linked Incident (for verification tracking)
    incident = models.ForeignKey('Incident', on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'is_active']),
            models.Index(fields=['created_at']),
        ]


class ResponderLocation(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('busy', 'Busy / Assisting'),
        ('responding', 'En Route to SOS'),
        ('patrolling', 'On Patrol'),
        ('offline', 'Offline'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='responder_location')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='responder_locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['user', 'event']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.status}"

class IncidentLog(models.Model):
    ACTION_CHOICES = (
        ('reported', 'Reported'),
        ('verified', 'Verified'),
        ('assigned', 'Assigned'),
        ('status_change', 'Status Changed'),
        ('priority_change', 'Priority Changed'),
        ('escalated', 'Escalated'),
        ('resolved', 'Resolved'),
        ('marked_false', 'Marked False'),
    )
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='logs')
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    previous_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['incident', 'timestamp']),
        ]

class SOSLog(models.Model):
    ACTION_CHOICES = (
        ('reported', 'Reported'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    )
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='logs')
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    previous_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['sos_alert', 'timestamp']),
        ]

class Notification(models.Model):
    TYPE_CHOICES = (
        ('sos', 'SOS Alert'),
        ('incident', 'Incident Report'),
        ('assignment', 'Volunteer Assignment'),
        ('broadcast', 'Safety Broadcast'),
        ('system', 'System Action'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    # Linked Source Entity (e.g. incident #45)
    entity_type = models.CharField(max_length=50, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    
    # Timing & Delivery Guarantees
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.title} for {self.user.email}"
