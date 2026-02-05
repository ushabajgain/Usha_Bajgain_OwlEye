"""
Core Models

Data models for the OwlEye platform.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

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
