from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Organization, Role, Permission, OrganizationMember
from authentication.serializers import TenantSerializer # as per existing view
from .serializers import RoleSerializer, PermissionSerializer, OrganizationMemberSerializer
from .permissions import IsTenantOwner, HasPermission

class OrganizationListView(generics.ListAPIView):
    queryset = Organization.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [AllowAny]

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


serializer = TenantCreateSerializer(data=request.data)
serializer.is_valid(raise_exception=True)

tenant = create_tenant(
    user=request.user,
    name=serializer.validated_data['name']
)