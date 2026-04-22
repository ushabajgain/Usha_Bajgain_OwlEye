from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).lower()
        if 'username' not in extra_fields:
            extra_fields['username'] = email

        user = self.model(email=email, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('attendee', 'Attendee'),
        ('organizer', 'Organizer'),
        ('volunteer', 'Volunteer'),
        ('authority', 'Authority / Admin'),
        ('admin', 'Admin'),
    )

    username = models.CharField(max_length=150, unique=True)

    email = models.EmailField(unique=True)

    full_name = models.CharField(max_length=255)
    nick_name = models.CharField(max_length=255, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    school = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True) # Location Name
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='attendee')
    is_active = models.BooleanField(default=True)
    
    # Reputation & Anti-Fake Reporting
    false_report_count = models.IntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def __str__(self):
        return f"{self.email} - {self.role}"
