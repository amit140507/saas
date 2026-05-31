from rest_framework import permissions
from core.tenants.permission_codes import Perms
from core.tenants.rbac_service import user_has_permission, get_member
from core.tenants.request_context import get_request_tenant, get_request_tenant_member

class IsSuperAdmin(permissions.IsAuthenticated):
    """Allows access only to global superusers."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser

def _get_cached_member(request, tenant):
    """Return the OrganizationMember for this request, caching it to avoid redundant DB hits."""
    cached_member = get_request_tenant_member(request)
    if cached_member is not None and getattr(cached_member, "tenant_id", None) == tenant.pk:
        return cached_member
    cache_key = f'_rbac_member_{tenant.pk}'
    if not hasattr(request, cache_key):
        setattr(request, cache_key, get_member(request.user, tenant))
    return getattr(request, cache_key)


class IsTenantMember(permissions.IsAuthenticated):
    """Allows access to any member of the current tenant."""
    message = "Authenticated user is not an active member of the selected organization."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        tenant = get_request_tenant(request)
        if not tenant:
            self.message = "Organization context is required. Provide X-Tenant-Id or X-Tenant-Slug."
            return False
        if request.user.is_superuser:
            return True
        return _get_cached_member(request, tenant) is not None

class IsTenantOwner(permissions.IsAuthenticated):
    """Allows access only to organization owners."""
    message = "Authenticated user is not an owner of the selected organization."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        tenant = get_request_tenant(request)
        if not tenant:
            self.message = "Organization context is required. Provide X-Tenant-Id or X-Tenant-Slug."
            return False
        if request.user.is_superuser:
            return True
        member = _get_cached_member(request, tenant)
        return member is not None and member.is_owner

def HasPermission(code: str):
    """Factory that returns a permission class checking for a specific code."""
    class _HasPermission(permissions.IsAuthenticated):
        message = f"Authenticated user does not have the required permission: {code}."

        def has_permission(self, request, view):
            if not super().has_permission(request, view):
                return False
            tenant = get_request_tenant(request)
            if not tenant:
                self.message = "Organization context is required. Provide X-Tenant-Id or X-Tenant-Slug."
                return False
            if request.user.is_superuser:
                return True
            return user_has_permission(request.user, tenant, code)
    return _HasPermission

class IsCoachOfClient(permissions.IsAuthenticated):
    """
    Object-level permission: Coaches see only their assigned clients.
    Owners/Admins can see everything.
    """
    def has_object_permission(self, request, view, obj):
        tenant = get_request_tenant(request)
        if not tenant:
            return False

        member = _get_cached_member(request, tenant)
        if not member:
            return False

        if member.is_owner or request.user.is_superuser:
            return True

        # Check if obj is a Client and assigned_to this user
        if hasattr(obj, 'assigned_to') and getattr(obj.assigned_to, 'user', None) == request.user:
            return True
        # Or if obj belongs to a client assigned to this user
        if hasattr(obj, 'client') and hasattr(obj.client, 'assigned_to') and getattr(obj.client.assigned_to, 'user', None) == request.user:
            return True

        return False

class IsClientOwner(permissions.IsAuthenticated):
    """
    Object-level permission: Clients see only their data.
    Staff/Owners can see all tenant data.
    Assumes the object has a 'user' or 'client.user' attribute.
    """
    def has_object_permission(self, request, view, obj):
        tenant = get_request_tenant(request)
        if not tenant:
            return False

        member = _get_cached_member(request, tenant)
        if not member:
            return False

        if member.is_owner or request.user.is_superuser:
            return True

        # If staff have manage clients permission, they see everything
        if user_has_permission(request.user, tenant, Perms.MANAGE_CLIENTS):
            return True

        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'client') and getattr(obj.client, 'user', None) == request.user:
            return True

        return False
