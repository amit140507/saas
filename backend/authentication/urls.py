from django.urls import include, path
from django.views.generic import TemplateView

from .views import (
    CheckAvailabilityView,
    GoogleLoginView,
    GoogleOnboardingView,
    GoogleSignupView,
)

urlpatterns = [
    path("", include("dj_rest_auth.urls")),
    path("registration/", include("dj_rest_auth.registration.urls")),
    path("google/login/", GoogleLoginView.as_view(), name="google_login"),
    path("google/signup/", GoogleSignupView.as_view(), name="google_signup"),
    path("google/onboarding/", GoogleOnboardingView.as_view(), name="google_onboarding"),
    path("check-availability/", CheckAvailabilityView.as_view(), name="check_availability"),

    # Compatibility stub for auth packages that reverse this route name internally.
    path(
        "password-reset/confirm/<uidb64>/<token>/",
        TemplateView.as_view(),
        name="password_reset_confirm",
    ),
]
