from django.urls import path
from .views import (
    StripeConfigView,
    CreateCheckoutSessionView,
    StripeWebhookView,
    VerifyPaymentView,
    CancelOrderView,
)

urlpatterns = [
    path('config/', StripeConfigView.as_view(), name='stripe_config'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create_checkout_session'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe_webhook'),
    path('verify/', VerifyPaymentView.as_view(), name='verify_payment'),
    path('cancel/', CancelOrderView.as_view(), name='cancel_order'),
]
