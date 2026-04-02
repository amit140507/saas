from django.urls import path, include
from .views import GoogleLogin, CheckAvailabilityView

urlpatterns = [
    path('', include('dj_rest_auth.urls')),
    path('registration/', include('dj_rest_auth.registration.urls')),
    path('google/', GoogleLogin.as_view(), name='google_login'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='check_availability'),
]
