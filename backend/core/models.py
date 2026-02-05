"""
Core Models

Data models for the OwlEye platform.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

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
    
    # Remove username field preference, use email instead
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    def __str__(self):
        return f"{self.email} ({self.role})"
