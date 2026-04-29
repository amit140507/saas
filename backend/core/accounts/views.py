from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.accounts.models import User
from core.accounts.serializers import UserSerializer
from core.tenants.permissions import IsSuperAdmin


class UserViewSet(viewsets.ModelViewSet):
    """
    Global user management.
    - List/retrieve: authenticated users can access their own record.
    - Write operations: superadmin only.
    """
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ('list', 'create', 'destroy'):
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Superadmins see all users; everyone else sees only themselves
        if user.is_superuser:
            return User.objects.all().prefetch_related('org_memberships__tenant', 'org_memberships__role')
        return User.objects.filter(pk=user.pk)