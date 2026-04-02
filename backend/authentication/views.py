from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()

class CheckAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.query_params.get('username')
        email = request.query_params.get('email')
        
        response_data = {}
        
        if username:
            exists = User.objects.exclude(pk=request.user.pk).filter(username=username).exists()
            response_data['username_available'] = not exists
            
        if email:
            exists = User.objects.exclude(pk=request.user.pk).filter(email=email).exists()
            response_data['email_available'] = not exists
            
        return Response(response_data)

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://127.0.0.1:3000/" # Should match frontend config
    client_class = OAuth2Client
