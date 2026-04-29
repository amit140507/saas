import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class TimeAwareModel(models.Model):
    """Abstract base to track creation and update times."""
    created_at = models.DateTimeField(auto_now_add=True,
        db_index=True,
        help_text="When this record was created")
    updated_at = models.DateTimeField(auto_now=True,
        db_index=True,
        help_text="Last time this record was updated")

    class Meta:
        abstract = True
        ordering = ["-created_at"]

class SoftDeleteManager(models.Manager):
    """Custom manager to filter out soft-deleted records."""
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeleteModel(models.Model):
    """Abstract base for soft deletion."""
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save()

    def hard_delete(self):
        super().delete()

    class Meta:
        abstract = True

class Organization(TimeAwareModel, SoftDeleteModel):
    """SaaS customer — a gym or fitness brand."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, db_index=True)                     # subdomain / URL key for multi tenancy
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, default='India')
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    gstin = models.CharField(max_length=15, null=True, blank=True)  # Tax ID
    currency = models.CharField(max_length=3, default='INR')
    is_active = models.BooleanField(default=True)
    
    # Flexible settings (Theme, notifications, features)
    settings = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return self.name

# Alias for compatibility with existing code
Tenant = Organization


class TenantAwareModel(TimeAwareModel, SoftDeleteModel):
    """Abstract base: all tenant-scoped models inherit this."""
    tenant = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='+',
        db_index=True
    )

    class Meta:
        abstract = True


class Permission(models.Model):
    """Global permission catalog — shared across all tenants."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)  # e.g. "manage_clients"
    category = models.CharField(max_length=50,blank=True,null=True)
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.code

    class Meta:
        indexes = [
            models.Index(fields=['code']),
        ]

class Role(TenantAwareModel):
    """
    Tenant-specific role (custom per gym).
    tenant FK is inherited from TenantAwareModel — do NOT redefine it here.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)  # e.g. 'owner', 'trainer', 'marketing', 'client'
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)

    # Fast-check flags — denormalised for performance, no join needed
    is_system = models.BooleanField(default=False, help_text="System roles cannot be deleted")
    is_default = models.BooleanField(default=False, help_text="Assigned to new members by default")
    is_active = models.BooleanField(default=True)
    permissions = models.ManyToManyField(
        Permission,
        through='RolePermission',
        related_name='roles',
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'name'],
                name='unique_role_name_per_tenant'
            ),
             models.UniqueConstraint(
                fields=['tenant', 'code'], 
                name='unique_role_code_per_tenant'
            )
        ]
        verbose_name = "Role"
        verbose_name_plural = "Roles"

    def __str__(self):
        return f"{self.name} ({self.tenant.name if getattr(self, 'tenant', None) else 'Global'})"

# class UserRole(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
#     role = models.ForeignKey(Role, on_delete=models.CASCADE)
#     organization = models.ForeignKey(Organization, on_delete=models.CASCADE)  # ← CRITICAL
    
#     class Meta:
#         unique_together = ('user', 'role', 'organization')
#         indexes = [
#             models.Index(fields=['user', 'organization']),
#         ]
        
class RolePermission(models.Model):
    """Explicit M2M through table for Role <-> Permission."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_permissions'
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['role', 'permission'],
                name='unique_role_permission'
            )
        ]
        indexes = [
            models.Index(fields=['role', 'permission']),
            models.Index(fields=['permission']),
        ]


class OrganizationMember(TenantAwareModel):
    """
    Explicit many-to-many between User and Tenant.
    Allows a user (e.g. owner) to belong to multiple tenants.

    tenant FK is inherited from TenantAwareModel — do NOT redefine it here.
    Role is the single source of truth for what the member can do.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='org_memberships'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members'
    )
    is_owner = models.BooleanField(default=False, help_text="Members with this role own the organization")
    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'tenant'],
                name='unique_user_per_tenant'
            ),
            models.UniqueConstraint(
                fields=['tenant'],
                condition=models.Q(is_owner=True),
                name='one_owner_per_tenant'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'tenant', 'status'])
        ]
        ordering = ['-joined_at']

    def has_permission(self, code: str) -> bool:
        """Check if this member's role grants a given permission code."""
        if not self.role_id:
            return False
        return self.role.permissions.filter(code=code).exists()

    def __str__(self):
        username = self.user.username if getattr(self, 'user', None) else self.user_id
        tenant_name = self.tenant.name if getattr(self, 'tenant', None) else self.tenant_id
        return f"{username} @ {tenant_name}"