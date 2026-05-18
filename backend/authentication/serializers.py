from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer, SocialLoginSerializer
from dj_rest_auth.serializers import PasswordResetConfirmSerializer, PasswordResetSerializer

from authentication.google_oauth import GoogleOAuthError, build_google_social_login
from authentication.services import (
    get_user_by_email,
    is_social_account_linked,
    onboard_owner_user,
    send_password_reset_email,
)


class CustomRegisterSerializer(RegisterSerializer):
    tenant_name = serializers.CharField(max_length=255, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["tenant_name"] = self.validated_data.get("tenant_name", "")
        data["phone"] = self.validated_data.get("phone", "")
        return data

    def custom_signup(self, request, user):
        tenant_name = self.cleaned_data.get("tenant_name", "").strip()
        if tenant_name:
            onboard_owner_user(
                user=user,
                tenant_name=tenant_name,
                phone=self.cleaned_data.get("phone", "").strip(),
            )


class BaseGoogleAuthSerializer(SocialLoginSerializer):
    """
    Validates the Google OAuth payload and returns an unsaved SocialLogin.
    Business rules such as login, signup, linking, and onboarding live in services.
    """

    def validate(self, attrs):
        view = self.context.get("view")
        request = self._get_request()

        if not view:
            raise serializers.ValidationError(_("View is not defined."))

        try:
            login = build_google_social_login(
                attrs=attrs,
                request=request,
                view=view,
                get_social_login=self.get_social_login,
            )
        except GoogleOAuthError as exc:
            raise serializers.ValidationError(_(exc.detail)) from exc

        email = (getattr(login.user, "email", "") or "").strip()
        if not email:
            raise serializers.ValidationError(
                _("Google account does not provide an email address."),
            )

        attrs["sociallogin"] = login
        attrs["email"] = email
        return attrs


class GoogleLoginSerializer(BaseGoogleAuthSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        sociallogin = attrs["sociallogin"]

        attrs["existing_user"] = get_user_by_email(attrs["email"])
        attrs["is_linked_account"] = is_social_account_linked(
            sociallogin.account.provider,
            sociallogin.account.uid,
        )
        return attrs


class GoogleSignupSerializer(BaseGoogleAuthSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        sociallogin = attrs["sociallogin"]

        if get_user_by_email(attrs["email"]):
            raise serializers.ValidationError(
                _("User is already registered with this e-mail address."),
            )

        if is_social_account_linked(
            sociallogin.account.provider,
            sociallogin.account.uid,
        ):
            raise serializers.ValidationError(
                _("This Google account is already linked to a user."),
            )

        return attrs


class GoogleOnboardingSerializer(serializers.Serializer):
    onboarding_token = serializers.CharField()
    tenant_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class CustomPasswordResetSerializer(PasswordResetSerializer):
    def save(self):
        email = self.validated_data.get("email")
        user_model = get_user_model()
        users = user_model.objects.filter(email__iexact=email, is_active=True)

        for user in users:
            send_password_reset_email(user=user)


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    def validate(self, attrs):
        uid = attrs.get("uid")
        token = attrs.get("token")
        user_model = get_user_model()

        if not uid or not token:
            raise serializers.ValidationError({"detail": "Missing uid or token."})

        try:
            # uid_decoded = urlsafe_base64_decode(uid).decode() # old method
            uid_decoded = force_str(urlsafe_base64_decode(uid)) # new method --better
            user = user_model.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, user_model.DoesNotExist):
            user = None

        if user is None:
            raise serializers.ValidationError({"uid": ["Invalid user ID."]})

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({"detail": "The link may have expired."})

        new_password1 = attrs.get("new_password1")
        new_password2 = attrs.get("new_password2")
        if new_password1 != new_password2:
            raise serializers.ValidationError({"new_password2": ["Passwords do not match."]})
        try:
            validate_password(new_password1, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password1": list(exc.messages)}) from exc

        self.user = user
        return attrs

    def save(self):
        password = self.validated_data.get("new_password1")
        self.user.set_password(password)
        self.user.save()
