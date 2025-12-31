import uuid
import stripe
from django.conf import settings
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from tickets.models import Ticket, TicketOrder
from events.models import Event, TicketPackage

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeConfigView(APIView):
    """Return the Stripe publishable key to the frontend."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'publishable_key': settings.STRIPE_PUBLISHABLE_KEY})


class CreateCheckoutSessionView(APIView):
    """Create a Stripe Checkout Session and a pending order."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        event_id = request.data.get('event')
        items = request.data.get('items', [])  # [{package_id, quantity}]
        billing_info = request.data.get('billing_info', {})

        if not items:
            return Response({"error": "No tickets selected."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(id=event_id, status='active')
        except (Event.DoesNotExist, ValueError, TypeError, Exception):
            return Response({"error": "Event not found or inactive."},
                            status=status.HTTP_404_NOT_FOUND)

        total_quantity = sum(item.get('quantity', 0) for item in items)
        current_tickets = Ticket.objects.filter(
            event=event, status__in=['issued', 'scanned']
        ).count()
        if current_tickets + total_quantity > event.capacity:
            return Response({"error": "Not enough capacity for this event."},
                            status=status.HTTP_400_BAD_REQUEST)

        line_items = []
        total_amount = 0
        order_items_to_create = []

        for item in items:
            try:
                pkg = TicketPackage.objects.get(
                    id=item.get('package_id'), event=event
                )
                qty = item.get('quantity', 0)
                if qty <= 0:
                    continue

                total_amount += pkg.price * qty
                order_items_to_create.append((pkg, qty))

                line_items.append({
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f"{event.name} — {pkg.name}",
                            'description': pkg.description or f"{pkg.seating_type} ticket",
                        },
                        'unit_amount': int(float(pkg.price) * 100),
                    },
                    'quantity': qty,
                })
            except (TicketPackage.DoesNotExist, ValueError, TypeError, Exception):
                return Response(
                    {"error": f"Invalid ticket package ID: {item.get('package_id')}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not line_items:
            return Response({"error": "No valid tickets selected."},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = TicketOrder.objects.create(
                user=request.user,
                event=event,
                first_name=billing_info.get('first_name', ''),
                last_name=billing_info.get('last_name', ''),
                email=billing_info.get('email', ''),
                total_amount=total_amount,
                status='pending',
            )


            for pkg, qty in order_items_to_create:
                for _ in range(qty):
                    Ticket.objects.create(
                        event=event,
                        user=request.user,
                        order=order,
                        package=pkg,
                        price_at_purchase=pkg.price,
                        qr_token=str(uuid.uuid4()),
                        status='issued',
                    )

        # ── Create Stripe Checkout Session ────────────────────────────
        frontend_url = settings.FRONTEND_URL
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f"{frontend_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order.id}",
                cancel_url=f"{frontend_url}/payment-cancel?order_id={order.id}",
                metadata={
                    'order_id': str(order.id),
                    'event_id': str(event.id),
                    'user_id': str(request.user.id),
                },
                customer_email=billing_info.get('email', request.user.email),
            )
        except Exception as e:
            # Rollback: delete the order and tickets if Stripe fails
            order.tickets.all().delete()
            order.delete()
            return Response({"error": str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save session ID on the order
        order.stripe_session_id = checkout_session.id
        order.save()

        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'order_id': str(order.id),
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhook events (payment confirmation)."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        if settings.STRIPE_WEBHOOK_SECRET:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
                )
            except (ValueError, stripe.error.SignatureVerificationError):
                return Response(status=status.HTTP_400_BAD_REQUEST)
        else:
            # For local dev without webhook secret
            import json
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)


        if event.get('type') == 'checkout.session.completed':
            session = event['data']['object']
            order_id = session.get('metadata', {}).get('order_id')

            if order_id:
                try:
                    order = TicketOrder.objects.get(id=order_id)
                    order.status = 'paid'
                    order.stripe_payment_intent = session.get('payment_intent', '')
                    order.save()
                except (TicketOrder.DoesNotExist, Exception):
                    pass

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)


class VerifyPaymentView(APIView):
    """Frontend calls this after redirect to confirm order status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        order_id = request.query_params.get('order_id')

        if not session_id and not order_id:
            return Response({"error": "session_id or order_id is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            if session_id:
                order = TicketOrder.objects.get(stripe_session_id=session_id)
            else:
                order = TicketOrder.objects.get(id=order_id, user=request.user)

            # Double-check with Stripe if still pending
            if order.status == 'pending' and order.stripe_session_id:
                try:
                    session = stripe.checkout.Session.retrieve(order.stripe_session_id)
                    if session.payment_status == 'paid':
                        order.status = 'paid'
                        order.stripe_payment_intent = session.payment_intent or ''
                        order.save()
                except Exception:
                    pass

            return Response({
                'order_id': str(order.id),
                'status': order.status,
                'event_name': order.event.name,
                'total_amount': str(order.total_amount),
                'ticket_count': order.tickets.count(),
            })

        except (TicketOrder.DoesNotExist, Exception):
            return Response({"error": "Order not found."},
                            status=status.HTTP_404_NOT_FOUND)


class CancelOrderView(APIView):
    """Cancel a pending (unpaid) order."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({"error": "order_id is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            order = TicketOrder.objects.get(id=order_id, user=request.user)
            if order.status == 'pending':
                order.tickets.all().delete()
                order.status = 'cancelled'
                order.save()
                return Response({"message": "Order cancelled."})
            return Response({"error": "Only pending orders can be cancelled."},
                            status=status.HTTP_400_BAD_REQUEST)
        except (TicketOrder.DoesNotExist, Exception):
            return Response({"error": "Order not found."},
                            status=status.HTTP_404_NOT_FOUND)
