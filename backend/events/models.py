from django.db import models
from django.conf import settings


class Event(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    )

    CATEGORY_CHOICES = (
        ('Music', 'Music'),
        ('Sports', 'Sports'),
        ('Fashion', 'Fashion'),
        ('Art & Design', 'Art & Design'),
        ('Food & Culinary', 'Food & Culinary'),
        ('Technology', 'Technology'),
        ('Health & Wellness', 'Health & Wellness'),
        ('Outdoor & Adventure', 'Outdoor & Adventure'),
        ('Business', 'Business'),
        ('Education', 'Education'),
        ('Other', 'Other'),
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES, default='Other')
    latitude = models.DecimalField(max_digits=12, decimal_places=9)
    longitude = models.DecimalField(max_digits=12, decimal_places=9)
    venue_address = models.CharField(max_length=255)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    capacity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    image = models.ImageField(upload_to='events/', blank=True, null=True)
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # New fields
    terms_conditions = models.TextField(blank=True, default='')
    seat_plan_image = models.ImageField(upload_to='events/seat_plans/', blank=True, null=True)
    seat_plan_description = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['id']),
            models.Index(fields=['organizer']),
        ]

    @property
    def attendee_count(self):
        return self.tickets.filter(status__in=['issued', 'scanned']).count()

    def __str__(self):
        return f"{self.name} ({self.status})"


class TicketPackage(models.Model):
    """Ticket packages/tiers for an event (e.g. Basic, Silver, Gold, VIP)"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_packages')
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, default='')
    perks = models.TextField(blank=True, default='', help_text='Comma-separated list of perks')
    seating_type = models.CharField(max_length=50, default='Standing', help_text='Standing or Seating')
    color = models.CharField(max_length=20, default='#2563eb')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'price']

    def __str__(self):
        return f"{self.name} - Rs. {self.price} ({self.event.name})"


class EventLike(models.Model):
    """Tracks user likes on events for social engagement."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_likes')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user} likes {self.event.name}"
