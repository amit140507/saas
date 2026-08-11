from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from django.conf import settings
from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import GoogleLoginSerializer, GoogleOnboardingSerializer, GoogleSignupSerializer
from .services import (
    GoogleAuthError,
    check_user_availability,
    complete_google_owner_onboarding,
    handle_google_login,
    handle_google_signup,
)


class CheckAvailabilityView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_check_availability"

    def get(self, request):
        username = request.query_params.get("username")
        email = request.query_params.get("email")
        exclude_current_user = request.query_params.get("exclude_current_user", "true").lower()
        exclude_user = (
            request.user
            if request.user.is_authenticated and exclude_current_user not in {"false", "0", "no"}
            else None
        )
        data = check_user_availability(
            username=username,
            email=email,
            exclude_user=exclude_user,
        )
        return Response(data)

class BaseGoogleAuthView(LoginView):
    permission_classes = (AllowAny,)
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = settings.GOOGLE_OAUTH_CALLBACK_URL

    def build_auth_response(self, user):
        self.user = user

        if self.serializer is not None:
            self.serializer.validated_data["user"] = user

        self.login()
        return self.get_response()

    def build_onboarding_response(self, onboarding_token):
        return Response(
            {
                "success": True,
                "requires_onboarding": True,
                "onboarding_token": onboarding_token,
            },
            status=status.HTTP_200_OK,
        )


class GoogleLoginView(BaseGoogleAuthView):
    serializer_class = GoogleLoginSerializer

    def post(self, request, *args, **kwargs):
        self.request = request
        self.serializer = self.get_serializer(data=request.data)
        self.serializer.is_valid(raise_exception=True)

        result = handle_google_login(
            request=request,
            sociallogin=self.serializer.validated_data["sociallogin"],
        )
        if result.requires_onboarding:
            return self.build_onboarding_response(result.onboarding_token)
        return self.build_auth_response(result.user)


class GoogleSignupView(BaseGoogleAuthView):
    serializer_class = GoogleSignupSerializer

    def post(self, request, *args, **kwargs):
        self.request = request
        self.serializer = self.get_serializer(data=request.data)
        self.serializer.is_valid(raise_exception=True)

        try:
            result = handle_google_signup(
                sociallogin=self.serializer.validated_data["sociallogin"],
            )
        except GoogleAuthError as exc:
            return Response({"non_field_errors": [str(exc.detail)]}, status=status.HTTP_400_BAD_REQUEST)

        return self.build_onboarding_response(result.onboarding_token)


class GoogleOnboardingView(BaseGoogleAuthView):
    serializer_class = GoogleOnboardingSerializer

    def post(self, request, *args, **kwargs):
        self.request = request
        self.serializer = self.get_serializer(data=request.data)
        self.serializer.is_valid(raise_exception=True)

        try:
            user = complete_google_owner_onboarding(
                request=request,
                onboarding_token=self.serializer.validated_data["onboarding_token"],
                tenant_name=self.serializer.validated_data["tenant_name"].strip(),
                phone=self.serializer.validated_data.get("phone", "").strip(),
            )
        except GoogleAuthError as exc:
            return Response({"non_field_errors": [str(exc.detail)]}, status=status.HTTP_400_BAD_REQUEST)

        return self.build_auth_response(user)
