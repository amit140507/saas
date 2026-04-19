import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class ActiveTenantManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class Tenant(models.Model):
    """SaaS customer — a gym or fitness brand."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, db_index=True)                     # subdomain / URL key
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
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActiveTenantManager()
    all_objects = models.Manager()
    
    def __str__(self):
        return self.name


class TenantAwareModel(models.Model):
    """Abstract base: all tenant-scoped models inherit this."""
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='+',
        db_index=True
    )

    class Meta:
        abstract = True


class OrganizationMember(TenantAwareModel):
    """
    Explicit many-to-many between User and Tenant.
    Allows a user (e.g. owner) to belong to multiple tenants.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='org_memberships'
    )
    role = models.ForeignKey(
        'users.Role',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_owner = models.BooleanField(default=False)
    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        INVITED = 'invited', 'Invited'
        SUSPENDED = 'suspended', 'Suspended'

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitations_sent'
    )

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
            models.Index(fields=['tenant', 'user'])
        ]
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user_id} @ {self.tenant_id} ({self.status})"
