from rest_framework import serializers
from users.models import User
from core.models import Tenant
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer, PasswordResetConfirmSerializer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('id', 'name')

class UserSerializer(serializers.ModelSerializer):
    tenant_details = TenantSerializer(source='tenant', read_only=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    sex = serializers.CharField(required=False, allow_blank=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)
    referral_source = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = (
            'pk', 'username', 'email', 'first_name', 'last_name', 
            'phone', 'dob', 'sex', 'date_of_joining', 
            'referral_source', 'tenant_details'
        )
        read_only_fields = ('tenant_details',)

    def update(self, instance, validated_data):
        # Handle all property-based profile fields
        for field in ['phone', 'dob', 'sex', 'date_of_joining', 'referral_source']:
            if field in validated_data:
                setattr(instance, field, validated_data.pop(field))
        return super().update(instance, validated_data)

class CustomRegisterSerializer(RegisterSerializer):
    tenant_name = serializers.CharField(max_length=255, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['tenant_name'] = self.validated_data.get('tenant_name', '')
        data['phone'] = self.validated_data.get('phone', '')
        return data

    def custom_signup(self, request, user):
        tenant_name = self.cleaned_data.get('tenant_name')
        if tenant_name:
            tenant, _ = Tenant.objects.get_or_create(name=tenant_name)
            user.tenant = tenant
            user.save()
            
            # Dynamically assign the 'owner' role
            from users.models import Role
            owner_role, _ = Role.objects.get_or_create(name='owner', tenant=tenant)
            user.roles.add(owner_role)
            
            # Use the writable property to set the phone in the profile
            phone = self.cleaned_data.get('phone')
            if phone:
                user.phone = phone

class CustomPasswordResetSerializer(PasswordResetSerializer):
    def save(self):
        request = self.context.get('request')
        email = self.validated_data.get('email')
        User = get_user_model()
        users = User.objects.filter(email__iexact=email, is_active=True)
        
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            # Use the frontend URL pattern from settings
            # Default: http://localhost:3000/reset-password/{uid}/{token}/
            url_pattern = getattr(settings, 'PASSWORD_RESET_CONFIRM_URL', 'http://localhost:3000/reset-password/{uid}/{token}/')
            
            # Format the URL
            # Note: handle both {uid} and {token} placeholders
            reset_url = url_pattern.replace('{uid}', uid).replace('{token}', token)
            
            # Send the email
            email_msg = f"""
Hello {user.username},

You're receiving this email because you requested a password reset for your account.

Please click the link below to set a new password:
{reset_url}

If you didn't request this change, you can safely ignore this email.

Best regards,
The Team
"""
            send_mail(
                subject="Password Reset Request",
                message=email_msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    def validate(self, attrs):
        uid = attrs.get('uid')
        token = attrs.get('token')
        
        if not uid or not token:
             raise serializers.ValidationError({'detail': 'Missing uid or token.'})

        try:
            uid_decoded = urlsafe_base64_decode(uid).decode()
            User = get_user_model()
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None:
            raise serializers.ValidationError({'uid': ['Invalid user ID.']})

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({'detail': 'The link may have expired.'})

        new_password1 = attrs.get('new_password1')
        new_password2 = attrs.get('new_password2')
        if new_password1 != new_password2:
            raise serializers.ValidationError({'new_password2': ['Passwords do not match.']})
            
        # Store user for save()
        self.user = user
        return attrs

    def save(self):
        password = self.validated_data.get('new_password1')
        self.user.set_password(password)
        self.user.save()
