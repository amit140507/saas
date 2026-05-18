from unittest.mock import patch

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount, SocialApp, SocialLogin
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.models import Site
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from core.staff.models import StaffProfile
from core.tenants.models import OrganizationMember, Tenant


User = get_user_model()


@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",
    SOCIALACCOUNT_AUTO_SIGNUP=True,
    FRONTEND_URL="https://app.example.com",
    GOOGLE_OAUTH_CALLBACK_URL="https://app.example.com/auth/google/callback/",
    REST_AUTH={
        "USE_JWT": True,
        "JWT_AUTH_COOKIE": "saas-auth",
        "JWT_AUTH_REFRESH_COOKIE": "saas-refresh-token",
        "REGISTER_SERIALIZER": "authentication.serializers.CustomRegisterSerializer",
        "USER_DETAILS_SERIALIZER": "core.accounts.serializers.UserSerializer",
        "PASSWORD_RESET_SERIALIZER": "authentication.serializers.CustomPasswordResetSerializer",
        "PASSWORD_RESET_CONFIRM_SERIALIZER": "authentication.serializers.CustomPasswordResetConfirmSerializer",
        "PASSWORD_RESET_CONFIRM_URL": "https://app.example.com/reset-password/{uid}/{token}/",
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.request_factory = APIRequestFactory()
        cache.clear()

    def create_google_app(self):
        site, _ = Site.objects.update_or_create(
            id=2,
            defaults={"domain": "example.com", "name": "example"},
        )
        app = SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="client-id",
            secret="secret",
        )
        app.sites.add(site)
        return app

    def build_social_login(self, *, email, username, uid):
        app = self.create_google_app()
        request = self.request_factory.post("/api/v1/auth/google/signup/")
        provider = app.get_provider(request)

        social_user = User(email=email, username=username)
        social_account = SocialAccount(
            provider="google",
            uid=uid,
            extra_data={"email": email},
        )
        social_account.user = social_user
        email_address = EmailAddress(
            user=social_user,
            email=email,
            verified=True,
            primary=True,
        )
        return SocialLogin(
            user=social_user,
            account=social_account,
            email_addresses=[email_address],
            provider=provider,
        )

    def test_registration_creates_owner_membership_and_staff_profile(self):
        response = self.client.post(
            "/api/v1/auth/registration/",
            {
                "username": "owner1",
                "email": "owner1@example.com",
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
                "tenant_name": "Iron Gym",
                "phone": "+1234567890",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="owner1")
        tenant = Tenant.objects.get(name="Iron Gym")
        membership = OrganizationMember.objects.get(user=user, tenant=tenant)
        profile = StaffProfile.objects.get(org_staff=membership)

        self.assertTrue(membership.is_owner)
        self.assertEqual(membership.role.name, "owner")
        self.assertEqual(profile.phone, "+1234567890")
        self.assertEqual(profile.tenant_id, tenant.id)

    def test_registration_without_phone_keeps_staff_profile_phone_empty(self):
        response = self.client.post(
            "/api/v1/auth/registration/",
            {
                "username": "owner2",
                "email": "owner2@example.com",
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
                "tenant_name": "Flex Lab",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="owner2")
        tenant = Tenant.objects.get(name="Flex Lab")
        membership = OrganizationMember.objects.get(user=user, tenant=tenant)
        profile = StaffProfile.objects.get(org_staff=membership)

        self.assertFalse(profile.phone)

    def test_password_reset_email_uses_frontend_url(self):
        user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="StrongPass123!",
        )

        response = self.client.post(
            "/api/v1/auth/password/reset/",
            {"email": user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn("https://app.example.com/reset-password/", body)

    def test_password_reset_email_lookup_is_case_insensitive(self):
        user = User.objects.create_user(
            username="resetcase",
            email="resetcase@example.com",
            password="StrongPass123!",
        )

        response = self.client.post(
            "/api/v1/auth/password/reset/",
            {"email": "ResetCase@Example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(user.email, mail.outbox[0].to)

    def test_password_reset_confirm_accepts_uid_payload(self):
        user = User.objects.create_user(
            username="confirmuser",
            email="confirm@example.com",
            password="OldPass123!",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            "/api/v1/auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password1": "NewPass123!",
                "new_password2": "NewPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass123!"))

    def test_google_login_uses_configured_callback_url(self):
        view = reverse("google_login")
        self.assertEqual(view, "/api/v1/auth/google/login/")

        from authentication.views import GoogleLoginView

        self.assertEqual(
            GoogleLoginView().callback_url,
            "https://app.example.com/auth/google/callback/",
        )

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_login_returns_onboarding_token_for_new_email(self, complete_social_login_mock):
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="new-google@example.com",
            username="googlenew",
            uid="google-new-uid",
        )

        with patch(
            "authentication.serializers.GoogleLoginSerializer.get_social_login",
            return_value=social_login,
        ):
            response = self.client.post(
                "/api/v1/auth/google/login/",
                {"access_token": "fake-token"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["requires_onboarding"])
        self.assertTrue(response.data["onboarding_token"])
        self.assertFalse(User.objects.filter(email="new-google@example.com").exists())
        self.assertFalse(SocialAccount.objects.filter(uid="google-new-uid").exists())

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_signup_returns_onboarding_token_for_new_email(self, complete_social_login_mock):
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="brand-new@example.com",
            username="brandnew",
            uid="google-signup-uid",
        )

        with patch(
            "authentication.serializers.GoogleSignupSerializer.get_social_login",
            return_value=social_login,
        ):
            response = self.client.post(
                "/api/v1/auth/google/signup/",
                {"access_token": "fake-token"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["requires_onboarding"])
        self.assertFalse(User.objects.filter(email="brand-new@example.com").exists())
        self.assertFalse(SocialAccount.objects.filter(uid="google-signup-uid").exists())

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_signup_rejects_existing_email_case_insensitively(self, complete_social_login_mock):
        User.objects.create_user(
            username="existinggoogleuser",
            email="existing@example.com",
            password="StrongPass123!",
        )
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="Existing@Example.com",
            username="googledupe",
            uid="google-existing-uid",
        )

        with patch(
            "authentication.serializers.GoogleSignupSerializer.get_social_login",
            return_value=social_login,
        ):
            response = self.client.post(
                "/api/v1/auth/google/signup/",
                {"access_token": "fake-token"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", str(response.data).lower())

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_login_auto_links_existing_email_and_logs_in(self, complete_social_login_mock):
        existing_user = User.objects.create_user(
            username="existingowner",
            email="existing-owner@example.com",
            password="StrongPass123!",
        )
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="Existing-Owner@Example.com",
            username="googleexistingowner",
            uid="google-link-uid",
        )

        with patch(
            "authentication.serializers.GoogleLoginSerializer.get_social_login",
            return_value=social_login,
        ):
            response = self.client.post(
                "/api/v1/auth/google/login/",
                {"access_token": "fake-token"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], existing_user.id)
        self.assertTrue(
            SocialAccount.objects.filter(
                user=existing_user,
                provider="google",
                uid="google-link-uid",
            ).exists()
        )

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_login_logs_in_existing_social_account(self, complete_social_login_mock):
        existing_user = User.objects.create_user(
            username="socialowner",
            email="social-owner@example.com",
            password="StrongPass123!",
        )
        SocialAccount.objects.create(
            user=existing_user,
            provider="google",
            uid="google-existing-social-uid",
            extra_data={"email": existing_user.email},
        )
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="social-owner@example.com",
            username="socialownergoogle",
            uid="google-existing-social-uid",
        )

        with patch(
            "authentication.serializers.GoogleLoginSerializer.get_social_login",
            return_value=social_login,
        ):
            response = self.client.post(
                "/api/v1/auth/google/login/",
                {"access_token": "fake-token"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], existing_user.id)
        self.assertEqual(
            SocialAccount.objects.filter(provider="google", uid="google-existing-social-uid").count(),
            1,
        )

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_onboarding_creates_user_tenant_membership_profile_and_social_account(
        self,
        complete_social_login_mock,
    ):
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="finish-signup@example.com",
            username="finishsignup",
            uid="google-onboarding-uid",
        )

        with patch(
            "authentication.serializers.GoogleSignupSerializer.get_social_login",
            return_value=social_login,
        ):
            signup_response = self.client.post(
                "/api/v1/auth/google/signup/",
                {"access_token": "fake-token"},
                format="json",
            )

        onboarding_response = self.client.post(
            "/api/v1/auth/google/onboarding/",
            {
                "onboarding_token": signup_response.data["onboarding_token"],
                "tenant_name": "Onboarding Gym",
                "phone": "+19876543210",
            },
            format="json",
        )

        self.assertEqual(onboarding_response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email="finish-signup@example.com")
        tenant = Tenant.objects.get(name="Onboarding Gym")
        membership = OrganizationMember.objects.get(user=user, tenant=tenant)
        profile = StaffProfile.objects.get(org_staff=membership)

        self.assertEqual(onboarding_response.data["user"]["id"], user.id)
        self.assertTrue(
            SocialAccount.objects.filter(
                user=user,
                provider="google",
                uid="google-onboarding-uid",
            ).exists()
        )
        self.assertTrue(
            EmailAddress.objects.filter(
                user=user,
                email__iexact="finish-signup@example.com",
                verified=True,
                primary=True,
            ).exists()
        )
        self.assertTrue(membership.is_owner)
        self.assertEqual(profile.phone, "+19876543210")

    def test_google_onboarding_requires_tenant_name(self):
        response = self.client.post(
            "/api/v1/auth/google/onboarding/",
            {"onboarding_token": "anything"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tenant_name", response.data)

    def test_google_onboarding_rejects_invalid_token(self):
        response = self.client.post(
            "/api/v1/auth/google/onboarding/",
            {
                "onboarding_token": "invalid-token",
                "tenant_name": "Broken Gym",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or expired onboarding token", str(response.data).lower())

    @patch("authentication.google_oauth.complete_social_login")
    def test_google_onboarding_duplicate_completion_fails_safely(self, complete_social_login_mock):
        complete_social_login_mock.return_value = None
        social_login = self.build_social_login(
            email="dup-signup@example.com",
            username="dupsignup",
            uid="google-dup-uid",
        )

        with patch(
            "authentication.serializers.GoogleSignupSerializer.get_social_login",
            return_value=social_login,
        ):
            signup_response = self.client.post(
                "/api/v1/auth/google/signup/",
                {"access_token": "fake-token"},
                format="json",
            )

        payload = {
            "onboarding_token": signup_response.data["onboarding_token"],
            "tenant_name": "Dup Gym",
        }
        first_response = self.client.post(
            "/api/v1/auth/google/onboarding/",
            payload,
            format="json",
        )
        second_response = self.client.post(
            "/api/v1/auth/google/onboarding/",
            payload,
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="dup-signup@example.com").count(), 1)
        self.assertEqual(Tenant.objects.filter(name="Dup Gym").count(), 1)

    def test_check_availability_email_is_case_insensitive(self):
        user = User.objects.create_user(
            username="availabilityowner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        User.objects.create_user(
            username="existinguser",
            email="taken@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(
            "/api/v1/auth/check-availability/",
            {"email": "Taken@Example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["email_available"])

    def test_check_availability_allows_unauthenticated_signup_checks(self):
        User.objects.create_user(
            username="existinguser2",
            email="existing2@example.com",
            password="StrongPass123!",
        )

        response = self.client.get(
            "/api/v1/auth/check-availability/",
            {"username": "existinguser2", "email": "Existing2@Example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["username_available"])
        self.assertFalse(response.data["email_available"])

    @override_settings(
        REST_FRAMEWORK={
            "DEFAULT_AUTHENTICATION_CLASSES": [
                "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
            ],
            "DEFAULT_THROTTLE_RATES": {
                "auth_check_availability": "2/minute",
            },
        },
    )
    def test_check_availability_is_throttled(self):
        first_response = self.client.get(
            "/api/v1/auth/check-availability/",
            {"username": "ratecheck1"},
        )
        second_response = self.client.get(
            "/api/v1/auth/check-availability/",
            {"username": "ratecheck2"},
        )
        third_response = self.client.get(
            "/api/v1/auth/check-availability/",
            {"username": "ratecheck3"},
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(third_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_password_reset_confirm_enforces_password_validators(self):
        user = User.objects.create_user(
            username="weakpassuser",
            email="weakpass@example.com",
            password="OldPass123!",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            "/api/v1/auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password1": "12345678",
                "new_password2": "12345678",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password1", response.data)
