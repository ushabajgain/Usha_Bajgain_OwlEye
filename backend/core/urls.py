from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, UserProfileView, LogoutView, 
    health_check, api_root,
    EventListCreateView, EventDetailView
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
]
