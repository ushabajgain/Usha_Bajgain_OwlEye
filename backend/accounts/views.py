from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'username' in self.fields:
            del self.fields['username']
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        return token
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email or not password:
            raise DRFValidationError({"detail": "Email and password are required."})
        
        try:
            user = User.objects.get(email=email.lower())
            if not user.check_password(password):
                raise DRFValidationError({"detail": "Invalid email or password."})
            
            if not user.is_active:
                raise DRFValidationError({"detail": "This account is banned."})
            
            refresh = self.get_token(user)
            
            data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'id': user.id,
                'full_name': user.full_name,
                'role': user.role
            }
            if user.profile_image:
                data['profile_image'] = user.profile_image.url
            return data
        except User.DoesNotExist:
            raise DRFValidationError({"detail": "Invalid email or password."})
        except DRFValidationError:
            raise
        except Exception as e:
            print(f"Login error: {type(e).__name__}: {e}")
            raise DRFValidationError({"detail": "Invalid email or password."})


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({
            "message": "User created successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        }, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        return serializer.save()

class PasswordResetRequestView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"email": ["Email field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"
            print(f"Password reset link: {reset_link}")
            
            try:
                send_mail(
                    'OwlEye - Password Reset Request',
                    f'Hello {user.full_name},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email.\n\n- OwlEye Team',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Email sending failed: {e}")
                return Response({"message": "Password reset link generated.", "reset_link": reset_link}, status=status.HTTP_200_OK)
            
            return Response({"message": "Password reset link sent to your email."}, status=status.HTTP_200_OK)
        else:
            return Response({"status_code": 404, "detail": "User not found with this email."}, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not uidb64 or not token or not new_password:
            return Response({"detail": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            # Prevent reusing the same password
            if user.check_password(new_password):
                return Response({"detail": "New password cannot be the same as your current password."}, status=status.HTTP_400_BAD_REQUEST)

            # Run Django's built-in password validators (length, complexity, etc.)
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                return Response({"detail": e.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save(update_fields=['password'])
            return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Invalid or expired reset link. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class UserProfileUpdateView(generics.UpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"error": "Missing old or new password."}, status=status.HTTP_400_BAD_REQUEST)

        if old_password == new_password:
            return Response({"error": "New password must be different from your current password."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Invalid current password."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"error": e.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        try:
            from monitoring.utils import send_notification
            send_notification(user, "Security Alert", "Your password was recently changed. If you did not do this, contact security.", "system")
        except: pass

        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
        except ImportError:
            pass

        return Response({"message": "Password updated. You've been logged out for security reasons."}, status=status.HTTP_200_OK)

class VolunteersListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role='volunteer')

class UserListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        search = self.request.query_params.get('search', '')
        if search:
            return User.objects.filter(email__icontains=search) | User.objects.filter(full_name__icontains=search)
        return User.objects.all()

class CertifyVolunteerView(views.APIView):
    permission_classes = [permissions.IsAuthenticated] # Should be IsAdminUser

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.role = 'volunteer'
            user.save()
            return Response({"message": f"{user.full_name} is now a certified volunteer."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class UpdateUserRoleView(views.APIView):
    permission_classes = [permissions.IsAuthenticated] # Should be IsAdminUser

    def post(self, request, pk):
        new_role = request.data.get('role')
        if new_role not in ['attendee', 'organizer', 'volunteer', 'admin']:
            return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=pk)
            user.role = new_role
            user.save()
            return Response({"message": f"User role updated to {new_role}."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class ToggleUserActiveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated] # Should be IsAdminUser

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            status_str = "activated" if user.is_active else "banned"
            return Response({"message": f"User {status_str} successfully."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class UpdateUserLocationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')

        if lat is None or lon is None:
            return Response({"error": "Latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from monitoring.utils import reverse_geocode
            location_name = reverse_geocode(lat, lon)
            
            user.latitude = lat
            user.longitude = lon
            user.location = location_name
            user.save()

            return Response({
                "message": "Location updated successfully.",
                "location_name": location_name,
                "latitude": lat,
                "longitude": lon
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
