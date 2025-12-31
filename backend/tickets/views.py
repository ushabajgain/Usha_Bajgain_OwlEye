import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ticket, TicketOrder
from events.models import Event, TicketPackage
from .serializers import TicketSerializer, TicketOrderSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class CreateTicketOrderView(generics.CreateAPIView):
    serializer_class = TicketOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        event_id = request.data.get('event')
        items = request.data.get('items', [])
        billing_info = request.data.get('billing_info', {})

        if not items:
            return Response({"error": "No tickets selected."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(id=event_id, status='active')
        except Event.DoesNotExist:
            return Response({"error": "Event not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        total_quantity = sum(item.get('quantity', 0) for item in items)
        
        current_tickets = Ticket.objects.filter(event=event, status__in=['issued', 'scanned']).count()
        if current_tickets + total_quantity > event.capacity:
            return Response({"error": "Not enough capacity for this event."}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = 0
        order_items_to_create = []

        for item in items:
            try:
                pkg = TicketPackage.objects.get(id=item.get('package_id'), event=event)
                qty = item.get('quantity', 0)
                if qty <= 0: continue
                
                total_amount += pkg.price * qty
                order_items_to_create.append((pkg, qty))
            except TicketPackage.DoesNotExist:
                return Response({"error": f"Invalid ticket package ID: {item.get('package_id')}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = TicketOrder.objects.create(
                user=request.user,
                event=event,
                first_name=billing_info.get('first_name', ''),
                last_name=billing_info.get('last_name', ''),
                email=billing_info.get('email', ''),
                total_amount=total_amount,
                status='paid'
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
                        status='issued'
                    )

        serializer = self.get_serializer(order)
        
        event.refresh_from_db()
        channel_layer = get_channel_layer()
        for group in [f"heatmap_{event.id}", "global"]:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'entity_broadcast',
                    'entity_type': 'event',
                    'action': 'stats_update',
                    'id': event.id,
                    'attendee_count': event.attendee_count,
                    'capacity': event.capacity
                }
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class BookTicketView(generics.CreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        event_id = request.data.get('event')
        return super().create(request, *args, **kwargs)

class UserTicketsListView(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(user=self.request.user).order_by('-created_at')

class OrganizerTicketsListView(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Ticket.objects.all().order_by('-created_at')
        return Ticket.objects.filter(event__organizer=self.request.user).order_by('-created_at')

class UserOrdersListView(generics.ListAPIView):
    serializer_class = TicketOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TicketOrder.objects.filter(user=self.request.user).order_by('-created_at')

class OrganizerOrdersListView(generics.ListAPIView):
    serializer_class = TicketOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return TicketOrder.objects.all().order_by('-created_at')
        return TicketOrder.objects.filter(event__organizer=self.request.user).order_by('-created_at')

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from monitoring.models import CrowdLocation

class ScanTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role not in ['organizer', 'admin', 'volunteer', 'authority']:
            return Response({"error": "Permission denied. Only staff can scan tickets."}, status=status.HTTP_403_FORBIDDEN)

        qr_token = request.data.get('qr_token')
        lat = request.data.get('lat')
        lng = request.data.get('lng')

        if not qr_token:
            return Response({"error": "QR token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                ticket = Ticket.objects.select_for_update().get(qr_token=qr_token)
                
                if ticket.status == 'scanned':
                    return Response({
                        "error": "Ticket has already been scanned.", 
                        "scanned_at": ticket.scanned_at
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if ticket.status == 'invalidated':
                    return Response({"error": "Ticket is invalidated."}, status=status.HTTP_400_BAD_REQUEST)

                ticket.status = 'scanned'
                ticket.scanned_at = timezone.now()
                ticket.save()
        except Ticket.DoesNotExist:
            return Response({"error": "Invalid ticket QR code."}, status=status.HTTP_404_NOT_FOUND)


        if lat and lng:
            CrowdLocation.objects.create(
                event=ticket.event,
                user=ticket.user,
                latitude=lat,
                longitude=lng,
                source_type='ticket_scan'
            )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"heatmap_{ticket.event.id}",
            {
                'type': 'entity_broadcast',
                'entity_type': 'ticket',
                'action': 'scan',
                'id': ticket.id,
                'status': ticket.status,
                'qr_token': ticket.qr_token,
                'user_name': ticket.user.full_name,
                'lat': float(lat) if lat else 0,
                'lng': float(lng) if lng else 0,
            }
        )


        return Response({"message": "Ticket successfully scanned and validated.", "ticket_id": ticket.id, "user": ticket.user.full_name}, status=status.HTTP_200_OK)

