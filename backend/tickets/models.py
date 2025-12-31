import uuid
from django.db import models
from django.conf import settings
from events.models import Event, TicketPackage

class TicketOrder(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled')
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_orders')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='orders')
    
    # Billing Info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Stripe fields
    stripe_session_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} - {self.email} - Rs. {self.total_amount}"

class Ticket(models.Model):
    STATUS_CHOICES = (
        ('issued', 'Issued'),
        ('scanned', 'Scanned'),
        ('invalidated', 'Invalidated')
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets')
    order = models.ForeignKey(TicketOrder, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    package = models.ForeignKey(TicketPackage, on_delete=models.SET_NULL, null=True, blank=True)
    
    qr_token = models.CharField(max_length=255, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    scanned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['qr_token']),
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"Ticket {self.id} for {self.user.email} - {self.event.name}"
