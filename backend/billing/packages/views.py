from rest_framework import viewsets, permissions
from .models import Package
from .serializers import PackageSerializer

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.filter(is_active=True)
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by current user's tenant
        user = self.request.user
        if user.is_staff:
            return Package.objects.filter(tenant=user.tenant, is_active=True)
        return Package.objects.filter(tenant=user.tenant, is_active=True)
