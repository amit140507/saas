from rest_framework import permissions

class IsSuperAdmin(permissions.IsAuthenticated):
    """Allows access only to global superusers."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser

class IsTenantOwner(permissions.IsAuthenticated):
    """Allows access only to organization owners (Admin)."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'is_owner', False)

class IsTenantStaff(permissions.IsAuthenticated):
    """Allows access to organization staff (Owner, Trainer, Marketing, etc.)."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'is_staff_member', False)

class IsTenantClient(permissions.IsAuthenticated):
    """Allows access only to organization clients."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'is_client', False)

class IsTrainer(permissions.IsAuthenticated):
    """Allows access only to trainers (coaches)."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'is_trainer', False)

class IsClientOwner(permissions.IsAuthenticated):
    """
    Object-level permission: Clients see only their data.
    Staff/Owners can see all tenant data.
    Assumes the object has a 'user' or 'client.user' attribute.
    """
    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_staff_member', False) or getattr(request.user, 'is_owner', False):
            return True
            
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'client') and getattr(obj.client, 'user', None) == request.user:
            return True
            
        return False

class IsCoachOfClient(permissions.IsAuthenticated):
    """
    Object-level permission: Coaches see only their assigned clients.
    Owners/Admins can see everything.
    """
    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_owner', False) or request.user.is_superuser:
            return True
            
        if getattr(request.user, 'is_trainer', False):
            # Check if obj is a Client and assigned to this coach
            if hasattr(obj, 'assigned_to') and getattr(obj.assigned_to, 'user', None) == request.user:
                return True
            # Or if obj belongs to a client assigned to this coach
            if hasattr(obj, 'client') and hasattr(obj.client, 'assigned_to') and getattr(obj.client.assigned_to, 'user', None) == request.user:
                return True
                
        return False
