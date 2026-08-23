from django.conf import settings
from django.http import Http404

from core.tenants.models import Organization


class TenantResolutionMiddleware:
    GLOBAL_PREFIXES = (
        "/admin/",
        "/__debug__/",
        "/api/v1/auth/",
        "/api/v1/workout/shared-assignments/",
    )
    GLOBAL_EXACT_PATHS = {
        "/api/v1/organizations/",
    }
    LOCAL_HOSTS = {"localhost", "127.0.0.1", "testserver"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        request.tenant_member = None

        if self._is_global_path(request.path_info):
            return self.get_response(request)

        tenant = self._resolve_tenant(request)
        request.tenant = tenant

        user = getattr(request, "user", None)
        if tenant and user and getattr(user, "is_authenticated", False):
            request.tenant_member = user.get_membership(tenant)

        return self.get_response(request)

    def _is_global_path(self, path):
        if path in self.GLOBAL_EXACT_PATHS:
            return True
        for prefix in self.GLOBAL_PREFIXES:
            if path.startswith(prefix):
                return True
        static_url = getattr(settings, "STATIC_URL", "")
        media_url = getattr(settings, "MEDIA_URL", "")
        return bool(
            (static_url and path.startswith(static_url))
            or (media_url and path.startswith(media_url))
        )

    def _resolve_tenant(self, request):
        host = request.get_host().split(":")[0].lower()
        header_slug = request.headers.get("X-Tenant-Slug")
        header_id = request.headers.get("X-Tenant-Id")
        allow_local_override = self._allow_local_override(host)

        if allow_local_override and header_slug:
            return self._get_tenant_by_slug(header_slug)
        if allow_local_override and header_id:
            return self._get_tenant_by_id(header_id)

        slug = self._extract_subdomain_slug(host)
        if slug:
            return self._get_tenant_by_slug(slug)
        return None

    def _allow_local_override(self, host):
        if getattr(settings, "DEBUG", False):
            return True
        return host in self.LOCAL_HOSTS or host.endswith(".localhost")

    def _extract_subdomain_slug(self, host):
        if host in self.LOCAL_HOSTS:
            return None
        if host.endswith(".localhost"):
            subdomain = host[: -len(".localhost")]
            return subdomain or None

        labels = [label for label in host.split(".") if label]
        if len(labels) < 3:
            return None
        return labels[0]

    def _get_tenant_by_slug(self, slug):
        tenant = Organization.objects.filter(slug=slug, is_active=True).first()
        if tenant is None:
            raise Http404("Unknown tenant.")
        return tenant

    def _get_tenant_by_id(self, tenant_id):
        tenant = Organization.objects.filter(pk=tenant_id, is_active=True).first()
        if tenant is None:
            raise Http404("Unknown tenant.")
        return tenant
