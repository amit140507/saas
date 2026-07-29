from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Organization, Role, Permission, OrganizationMember
from core.tenants.serializers import TenantSerializer, TenantCreateSerializer # as per existing view
from core.tenants.services import create_tenant
from .serializers import (
    OrganizationSettingsSerializer,
    RoleSerializer,
    PermissionSerializer,
    OrganizationMemberSerializer,
)
from .permissions import IsTenantOwner, HasPermission

class OrganizationListView(generics.ListCreateAPIView):

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        # Users only see orgs they are a member of
        return Organization.objects.filter(
            organizationmember__user=self.request.user,
            organizationmember__status='active',
        ).distinct()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TenantCreateSerializer
        return TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tenant = create_tenant(
            user=request.user,
            name=serializer.validated_data['name'],
        )

        return Response(
            TenantSerializer(tenant, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationSettingsView(generics.RetrieveUpdateAPIView):
    """Retrieve/update organization settings. Only org owners can access it."""
    serializer_class = OrganizationSettingsSerializer
    permission_classes = [IsTenantOwner]
    http_method_names = ["get", "patch", "head", "options"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        if not self.request.tenant or self.request.tenant.pk != self.kwargs["tenant_id"]:
            from rest_framework.exceptions import NotFound
            raise NotFound("Organization not found.")
        tenant = get_object_or_404(
            Organization,
            pk=self.kwargs["tenant_id"],
            is_active=True,
        )
        self.check_object_permissions(self.request, tenant)
        return tenant


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD for Roles. Only org owners can manage roles."""
    serializer_class = RoleSerializer
    permission_classes = [IsTenantOwner]

    def get_queryset(self):
        return Role.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def perform_destroy(self, instance):
        if instance.is_system:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot delete system roles.")
        instance.delete()

class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """List available permissions. Read-only."""
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]

class OrganizationMemberViewSet(viewsets.ModelViewSet):
    """Manage org members and their roles. Only owners or managers."""
    serializer_class = OrganizationMemberSerializer
    # Usually you'd check if user has 'manage_staff'. If they do, they can add/remove members.
    permission_classes = [IsTenantOwner | HasPermission("manage_staff")]

    def get_queryset(self):
        return OrganizationMember.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)
