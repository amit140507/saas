from rest_framework.exceptions import NotFound


def resolve_package_tenant(request):
    tenant = getattr(request, "tenant", None)
    if tenant is not None:
        return tenant

    membership = (
        request.user.org_memberships
        .filter(status="active")
        .select_related("tenant")
        .first()
    )
    if membership is None:
        raise NotFound("No active organization membership found.")

    return membership.tenant
