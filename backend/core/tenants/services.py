from django.db import transaction
from django.utils.text import slugify

from core.tenants.models import OrganizationMember, Role, Tenant


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

    owner_role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name='owner',
        defaults={
            'description': 'Organization owner',
            'is_system': True,
        },
    )

    OrganizationMember.objects.create(
        user=user,
        tenant=tenant,
        role=owner_role,
        is_owner=True,
    )

    return tenant