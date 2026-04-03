from rest_framework import permissions

# These role-based classes are deprecated.
# We now use Django's native Group and Permission models.
# For generic views, use `rest_framework.permissions.DjangoModelPermissions`.
# Or use `request.user.has_perm('app.action')`.

class HasRolePermission(permissions.IsAuthenticated):
    pass

class IsOwner(HasRolePermission):
    pass

class IsTenantAdmin(HasRolePermission):
    pass

class IsCoach(HasRolePermission):
    pass

class IsTrainer(HasRolePermission):
    pass

class IsMarketing(HasRolePermission):
    pass
