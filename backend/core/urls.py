from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, UserProfileView, LogoutView, 
    health_check, api_root,
    EventListCreateView, EventDetailView,
    JoinEventView, MyTicketsView, ScanTicketView,
    IncidentListCreateView, IncidentDetailView,
    SOSAlertListCreateView, SOSAlertDetailView,
    SafetyAlertListCreateView,
    ResponderLocationUpdateView, ResponderLocationListView,
    EventDashboardStatsView
)

app_name = 'core'

urlpatterns = [
    # Health check
    path('health/', health_check, name='health_check'),
    
    # API Root
    path('', api_root, name='api_root'),
    
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/me/', UserProfileView.as_view(), name='auth_profile'),
    
    # Event Endpoints
    path('events/', EventListCreateView.as_view(), name='event_list_create'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event_detail'),

    # Ticket Endpoints
    path('tickets/join-event/', JoinEventView.as_view(), name='join_event'),
    path('tickets/my-tickets/', MyTicketsView.as_view(), name='my_tickets'),
    path('tickets/scan/', ScanTicketView.as_view(), name='scan_ticket'),

    # Incident Endpoints
    path('incidents/', IncidentListCreateView.as_view(), name='incident_list_create'),
    path('incidents/<int:pk>/', IncidentDetailView.as_view(), name='incident_detail'),

    # SOS Endpoints
    path('sos/', SOSAlertListCreateView.as_view(), name='sos_list_create'),
    path('sos/<int:pk>/', SOSAlertDetailView.as_view(), name='sos_detail'),

    # Safety Alert Endpoints
    path('alerts/', SafetyAlertListCreateView.as_view(), name='safety_alert_list_create'),

    # Responder Endpoints
    path('responders/update/', ResponderLocationUpdateView.as_view(), name='responder_location_update'),
    path('responders/', ResponderLocationListView.as_view(), name='responder_location_list'),

    # Dashboard Statistics
    path('events/<int:event_id>/stats/', EventDashboardStatsView.as_view(), name='event_dashboard_stats'),
]
