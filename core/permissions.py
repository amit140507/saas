from rest_framework import permissions

class HasRolePermission(permissions.IsAuthenticated):
    allowed_roles = []

    def has_permission(self, request, view):
        is_authenticated = super().has_permission(request, view)
        if not is_authenticated:
            return False
            
        # Superusers can bypass role checks
        if request.user.is_superuser:
            return True
            
        return request.user.role in self.allowed_roles


class IsOwner(HasRolePermission):
    allowed_roles = ['owner']

class IsTenantAdmin(HasRolePermission):
    allowed_roles = ['owner', 'admin']

class IsCoach(HasRolePermission):
    allowed_roles = ['owner', 'admin', 'coach']

class IsTrainer(HasRolePermission):
    allowed_roles = ['owner', 'admin', 'trainer']

class IsMarketing(HasRolePermission):
    allowed_roles = ['owner', 'admin', 'marketing']
