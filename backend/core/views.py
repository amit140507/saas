from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Tenant
from authentication.serializers import TenantSerializer

class TenantListView(generics.ListAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [AllowAny]
