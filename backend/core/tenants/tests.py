from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.tenants.models import Organization
from core.tenants.services import create_tenant


User = get_user_model()


@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",
    ALLOWED_HOSTS=["testserver", ".example.com"],
)
class TenantResolutionMiddlewareTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.tenant = create_tenant(user=self.owner, name="Iron Gym")
        self.other_tenant = Organization.objects.create(
            name="Other Gym",
            slug="other-gym",
            is_active=True,
        )

    def test_global_organizations_route_works_without_tenant_context(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/v1/organizations/")
        self.assertEqual(response.status_code, 200)

    def test_header_override_resolves_tenant_for_local_requests(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/v1/organizations/{self.tenant.id}/roles/",
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )
        self.assertEqual(response.status_code, 200)

    def test_subdomain_resolves_tenant_for_normal_requests(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/v1/organizations/{self.tenant.id}/roles/",
            HTTP_HOST=f"{self.tenant.slug}.example.com",
        )
        self.assertEqual(response.status_code, 200)

    def test_missing_tenant_context_is_denied_for_tenant_scoped_endpoint(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f"/api/v1/organizations/{self.tenant.id}/roles/")
        self.assertEqual(response.status_code, 403)

    def test_unknown_tenant_header_returns_not_found(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/v1/organizations/{self.tenant.id}/roles/",
            HTTP_X_TENANT_SLUG="missing-tenant",
        )
        self.assertEqual(response.status_code, 404)

    def test_header_override_takes_precedence_in_test_requests(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(
            f"/api/v1/organizations/{self.tenant.id}/roles/",
            HTTP_HOST=f"{self.other_tenant.slug}.example.com",
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )
        self.assertEqual(response.status_code, 200)
