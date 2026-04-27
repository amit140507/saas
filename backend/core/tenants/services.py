from backend.core.tenants.models import Organization
from core.tenants.models import Tenant

def create_tenant(*, user, name):
    tenant = Tenant.objects.create(name=name)

    Organization.objects.create(
        user=user,
        tenant=tenant,
        role='owner'
    )

    return tenant