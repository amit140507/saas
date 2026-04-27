from django.contrib.auth.models import AbstractUser, BaseUserManager, UserManager as DjangoUserManager
from django.db import models, IntegrityError, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


class UserQuerySet(models.QuerySet):
    def superadmins(self):
        """Users with global Django admin access."""
        return self.filter(is_superuser=True)

    def with_role(self, tenant, role_name):
        """Filter users who have a specific role in a specific tenant."""
        return self.filter(
            org_memberships__tenant=tenant,
            org_memberships__role__name=role_name,
            org_memberships__status='active',
        )


class UserManager(DjangoUserManager.from_queryset(UserQuerySet)):
    use_in_migrations = True


class User(AbstractUser):
    """
    Global user — not tied to any tenant directly.
    Tenant membership is handled via OrganizationMember.
    """
    objects = UserManager()

    public_id = models.CharField(max_length=6, unique=True, null=True, blank=True)

    def __str__(self):
        return self.username

    # ------------------------------------------------------------------
    # Role helpers — always scoped to a tenant via OrganizationMember
    # ------------------------------------------------------------------

    def get_membership(self, tenant):
        """Return the active OrganizationMember record for this user in a tenant."""
        return self.org_memberships.filter(tenant=tenant, status='active').select_related('role').first()

    def has_role(self, tenant, role_name: str) -> bool:
        """Check if user has a named role within a specific tenant."""
        return self.org_memberships.filter(
            tenant=tenant,
            role__name=role_name,
            status='active'
        ).exists()

    def has_permission(self, tenant, permission_code: str) -> bool:
        """Check if user's role in a tenant grants a given permission."""
        return self.org_memberships.filter(
            tenant=tenant,
            status='active',
            role__permissions__code=permission_code
        ).exists()

    def is_tenant_owner(self, tenant) -> bool:
        """Fast owner check using the Role.is_owner flag."""
        return self.org_memberships.filter(
            tenant=tenant,
            status='active',
            role__is_owner=True
        ).exists()

    # ------------------------------------------------------------------
    # public_id generation
    # ------------------------------------------------------------------

    def save(self, *args, **kwargs):
        if not self.public_id:
            from .helpers import generate_unique_public_id
            for _ in range(10):  # limit retries
                self.public_id = generate_unique_public_id()
                try:
                    with transaction.atomic():
                        return super().save(*args, **kwargs)
                except IntegrityError:
                    self.public_id = None  # retry
            raise Exception("Could not generate unique public_id after retries")

        return super().save(*args, **kwargs)


# ------------------------------------------------------------------
# Signals
# ------------------------------------------------------------------

@receiver(post_save, sender=User)
def create_user_profiles(sender, instance, created=False, **kwargs):
    """
    Profile creation is now triggered when OrganizationMember is created,
    not on User save — because User has no tenant context at creation time.

    This signal is intentionally a no-op; kept as a hook for future use.
    See OrganizationMember post_save signal in tenants/signals.py.
    """
    pass
