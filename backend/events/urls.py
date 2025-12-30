from django.urls import path
from .views import EventListCreateView, EventDetailView, PublishEventView, UnpublishEventView, ToggleLikeView, EventVolunteersView

urlpatterns = [
    path('', EventListCreateView.as_view(), name='event_list_create'),
    path('<int:pk>/', EventDetailView.as_view(), name='event_detail'),
    path('<int:pk>/publish/', PublishEventView.as_view(), name='publish_event'),
    path('<int:pk>/unpublish/', UnpublishEventView.as_view(), name='unpublish_event'),
    path('<int:pk>/like/', ToggleLikeView.as_view(), name='toggle_like'),
    path('<int:event_id>/volunteers/', EventVolunteersView.as_view(), name='event_volunteers'),
]
