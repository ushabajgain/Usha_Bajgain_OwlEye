from django.urls import path
from .views import (
    BookTicketView, UserTicketsListView, ScanTicketView, 
    CreateTicketOrderView, UserOrdersListView, OrganizerOrdersListView,
    OrganizerTicketsListView
)

urlpatterns = [
    path('book/', BookTicketView.as_view(), name='book_ticket'),
    path('order/', CreateTicketOrderView.as_view(), name='create_order'),
    path('my-tickets/', UserTicketsListView.as_view(), name='my_tickets'),
    path('my-orders/', UserOrdersListView.as_view(), name='my_orders'),
    path('organizer-orders/', OrganizerOrdersListView.as_view(), name='organizer_orders'),
    path('organizer-tickets/', OrganizerTicketsListView.as_view(), name='organizer_tickets'),
    path('scan/', ScanTicketView.as_view(), name='scan_ticket'),
]
