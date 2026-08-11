from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StaffProfile
from .serializers import StaffProfileSerializer
from .services import set_staff_status
from core.tenants.models import OrganizationMember
from core.tenants.permissions import HasPermission


class StaffProfileViewSet(viewsets.ModelViewSet):
    """
    CRUD for StaffProfiles scoped to the current tenant.
    Coaches see all staff; only owners/admins with manage_staff can create/update/delete.
    """
    serializer_class = StaffProfileSerializer

    def get_permissions(self):
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

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        staff = set_staff_status(self.get_object(), OrganizationMember.StatusChoices.ACTIVE)
        return Response(self.get_serializer(staff).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        staff = set_staff_status(self.get_object(), OrganizationMember.StatusChoices.INACTIVE)
        return Response(self.get_serializer(staff).data)
