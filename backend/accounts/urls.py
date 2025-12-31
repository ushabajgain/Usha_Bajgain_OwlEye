from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, CustomTokenObtainPairView, UserProfileView, UserProfileUpdateView, ChangePasswordView, PasswordResetRequestView, PasswordResetConfirmView, VolunteersListView, UserListView, CertifyVolunteerView, UpdateUserRoleView, ToggleUserActiveView, UpdateUserLocationView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/update/', UserProfileUpdateView.as_view(), name='profile-update'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', PasswordResetRequestView.as_view(), name='forgot-password'),
    path('reset-password/', PasswordResetConfirmView.as_view(), name='reset-password'),
    path('volunteers/', VolunteersListView.as_view(), name='volunteers-list'),
    path('all-users/', UserListView.as_view(), name='all-users-list'),
    path('certify-volunteer/<int:pk>/', CertifyVolunteerView.as_view(), name='certify-volunteer'),
    path('update-role/<int:pk>/', UpdateUserRoleView.as_view(), name='update-role'),
    path('toggle-active/<int:pk>/', ToggleUserActiveView.as_view(), name='toggle-active'),
    path('user/location/', UpdateUserLocationView.as_view(), name='user-location'),
]
