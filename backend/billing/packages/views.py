from django.db.models import Prefetch
from rest_framework import viewsets
from billing.subscriptions.models import Feature
from .models import Package, PackagePlan
from .permissions import CanManagePackages, IsPackageTenantMember
from .serializers import FeatureCatalogSerializer, PackageSerializer
from .services import delete_or_archive_package, resolve_package_tenant


class FeatureCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FeatureCatalogSerializer
    permission_classes = [CanManagePackages]

    def get_queryset(self):
        tenant = resolve_package_tenant(self.request)
        return Feature.objects.filter(tenant=tenant).order_by('name')


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
            .prefetch_related(
                Prefetch('plans', queryset=PackagePlan.objects.filter(tenant=tenant)),
                'package_features__feature',
            )
            .order_by('name')
        )

    def perform_destroy(self, instance):
        delete_or_archive_package(instance)
