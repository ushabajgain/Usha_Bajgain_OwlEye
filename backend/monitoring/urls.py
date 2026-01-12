from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IncidentViewSet, SOSAlertViewSet, SafetyAlertViewSet, ResponderLocationViewSet, EventOverviewView,
    IncidentLogViewSet, SOSLogViewSet, CurrentLocationsView, DashboardStatsView, HeatmapView,
    ReverseGeocodeView, CrowdMovementPatternsView, NotificationViewSet
)
from .monitoring_views import SOSMetricsView, SystemHealthView

router = DefaultRouter()
router.register(r'incidents', IncidentViewSet)
router.register(r'sos', SOSAlertViewSet)
router.register(r'alerts', SafetyAlertViewSet)
router.register(r'responders', ResponderLocationViewSet)
router.register(r'incident-logs', IncidentLogViewSet)
router.register(r'sos-logs', SOSLogViewSet)
router.register(r'notifications', NotificationViewSet)

urlpatterns = [
    path('overview/<int:event_id>/', EventOverviewView.as_view(), name='event-overview'),
    path('locations/<int:event_id>/', CurrentLocationsView.as_view(), name='current-locations'),
    path('stats/<int:event_id>/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('heatmap/<int:event_id>/', HeatmapView.as_view(), name='heatmap-data'),
    path('movement-patterns/<int:event_id>/', CrowdMovementPatternsView.as_view(), name='movement-patterns'),
    path('reverse-geocode/', ReverseGeocodeView.as_view(), name='reverse-geocode'),
    path('metrics/sos/', SOSMetricsView.as_view(), name='sos-metrics'),
    path('health/', SystemHealthView.as_view(), name='system-health'),
    path('', include(router.urls)),
]
