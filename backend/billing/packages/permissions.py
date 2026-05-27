from rest_framework import permissions

from core.tenants.permission_codes import Perms
from core.tenants.rbac_service import get_member, user_has_permission
from .services import resolve_package_tenant


class IsPackageTenantMember(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True

        tenant = resolve_package_tenant(request)
        return get_member(request.user, tenant) is not None


class CanManagePackages(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True

        tenant = resolve_package_tenant(request)
        return user_has_permission(request.user, tenant, Perms.MANAGE_PLANS)
