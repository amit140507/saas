from django.db import transaction
from django.utils.text import slugify

from core.tenants.models import OrganizationMember, Role, Tenant
from core.tenants.rbac_service import seed_default_roles


def _unique_slug(name):
    base_slug = slugify(name) or "organization"
    slug = base_slug
    counter = 2

    while Tenant.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


@transaction.atomic
def create_tenant(*, user, name):
    tenant = Tenant.objects.create(name=name, slug=_unique_slug(name))

    # Seed all default roles (owner, trainer, marketing, client)
    # Done here in the service — NOT via post_save signal (signal is disabled)
    seed_default_roles(tenant)

    owner_role = Role.objects.get(tenant=tenant, name='owner')

    OrganizationMember.objects.create(
        user=user,
        tenant=tenant,
        role=owner_role,
        is_owner=True,
    )

    return tenant