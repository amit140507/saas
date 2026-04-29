from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist

from .models import Client
from .serializers import ClientSerializer
from .services import activate_client, deactivate_client, create_client
from core.tenants.permissions import IsTenantMember, HasPermission, IsCoachOfClient


class ClientViewSet(viewsets.ModelViewSet):
    """
    Clients scoped to the current tenant.
    - Owners / staff with manage_clients: full access.
    - Coaches: see only their assigned clients (enforced by IsCoachOfClient).
    """
    serializer_class = ClientSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsTenantMember()]
        if self.action in ('activate', 'deactivate'):
            return [HasPermission('manage_clients')()]
        return [HasPermission('manage_clients')()]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Client.objects.none()

        qs = (
            Client.objects
            .filter(tenant=tenant)
            .select_related('org_client__user', 'org_client__role', 'assigned_trainer')
        )

        # Coaches see only their own clients
        from core.tenants.rbac_service import get_member
        member = get_member(self.request.user, tenant)
        if member and not member.is_owner:
            try:
                staff = self.request.user.org_memberships.get(tenant=tenant).staff_profile
                qs = qs.filter(assigned_trainer=staff)
            except (ObjectDoesNotExist, AttributeError):
                # User is a tenant member but has no StaffProfile — show no clients.
                qs = Client.objects.none()

        return qs

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        client = self.get_object()
        activate_client(client)
        return Response(ClientSerializer(client, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        client = self.get_object()
        deactivate_client(client)
        return Response(ClientSerializer(client, context=self.get_serializer_context()).data)
