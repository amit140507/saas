from rest_framework.exceptions import NotFound


def get_request_tenant(request):
    return getattr(request, "tenant", None)


def get_request_tenant_member(request):
    return getattr(request, "tenant_member", None)


def require_request_tenant(request):
    tenant = get_request_tenant(request)
    if tenant is None:
        raise NotFound("Tenant context is required for this endpoint.")
    return tenant
