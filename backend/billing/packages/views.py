from rest_framework import viewsets
from .models import Package
from .permissions import CanManagePackages, IsPackageTenantMember
from .serializers import PackageSerializer
from .services import resolve_package_tenant

class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsPackageTenantMember()]
        return [CanManagePackages()]

    def get_queryset(self):
        tenant = resolve_package_tenant(self.request)
        return (
            Package.objects
            .filter(tenant=tenant)
            .prefetch_related('plans', 'package_features__feature')
            .order_by('name')
        )
