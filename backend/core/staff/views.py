from rest_framework import viewsets
from .models import StaffProfile
from .serializers import StaffProfileSerializer
from core.tenants.permissions import IsTenantMember, HasPermission


class StaffProfileViewSet(viewsets.ModelViewSet):
    """
    CRUD for StaffProfiles scoped to the current tenant.
    Coaches see all staff; only owners/admins with manage_staff can create/update/delete.
    """
    serializer_class = StaffProfileSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsTenantMember()]
        return [HasPermission('manage_staff')()]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return StaffProfile.objects.none()
        return (
            StaffProfile.objects
            .filter(tenant=tenant)
            .select_related('org_staff__user', 'org_staff__role')
        )
