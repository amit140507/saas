import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.tenants.models import Organization, OrganizationMember, Role
from core.tenants.services import create_tenant


User = get_user_model()


@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",
    ALLOWED_HOSTS=["testserver", ".example.com"],
)
class TenantResolutionMiddlewareTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.media_root = tempfile.mkdtemp()
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

    def tearDown(self):
        shutil.rmtree(self.media_root, ignore_errors=True)
        super().tearDown()

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

    def test_owner_can_retrieve_and_patch_brand_color(self):
        self.client.force_authenticate(user=self.owner)

        get_response = self.client.get(
            f"/api/v1/organizations/{self.tenant.id}/settings/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["brand_color"], "#EF4444")

        patch_response = self.client.patch(
            f"/api/v1/organizations/{self.tenant.id}/settings/",
            {"brand_color": "#22C55E"},
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["brand_color"], "#22C55E")
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.brand_color, "#22C55E")

    def test_non_owner_cannot_patch_brand_color(self):
        trainer = User.objects.create_user(
            username="trainer",
            email="trainer@example.com",
            password="StrongPass123!",
        )
        trainer_role = Role.objects.get(tenant=self.tenant, name="trainer")
        OrganizationMember.objects.create(
            user=trainer,
            tenant=self.tenant,
            role=trainer_role,
            is_owner=False,
        )

        self.client.force_authenticate(user=trainer)
        response = self.client.patch(
            f"/api/v1/organizations/{self.tenant.id}/settings/",
            {"brand_color": "#22C55E"},
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_brand_color_is_rejected(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/v1/organizations/{self.tenant.id}/settings/",
            {"brand_color": "tomato"},
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("brand_color", response.data)

    def test_short_hex_brand_color_is_normalized(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            f"/api/v1/organizations/{self.tenant.id}/settings/",
            {"brand_color": "#abc"},
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["brand_color"], "#AABBCC")

    def test_owner_can_patch_profile_fields_and_logo(self):
        self.client.force_authenticate(user=self.owner)
        with override_settings(MEDIA_ROOT=self.media_root):
            response = self.client.patch(
                f"/api/v1/organizations/{self.tenant.id}/settings/",
                {
                    "name": "Iron Gym Pro",
                    "slug": "iron-gym-pro",
                    "website": "https://irongym.example.com",
                    "gstin": "22aaaaa0000a1z5",
                    "brand_color": "#22C55E",
                    "logo": SimpleUploadedFile(
                        "logo.gif",
                        (
                            b"GIF87a\x01\x00\x01\x00\x80\x00\x00"
                            b"\x00\x00\x00\xff\xff\xff!\xf9\x04\x01"
                            b"\x00\x00\x00\x00,\x00\x00\x00\x00\x01"
                            b"\x00\x01\x00\x00\x02\x02D\x01\x00;"
                        ),
                        content_type="image/gif",
                    ),
                },
                format="multipart",
                HTTP_X_TENANT_ID=str(self.tenant.id),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Iron Gym Pro")
        self.assertEqual(response.data["slug"], "iron-gym-pro")
        self.assertEqual(response.data["website"], "https://irongym.example.com")
        self.assertEqual(response.data["gstin"], "22AAAAA0000A1Z5")
        self.assertTrue(response.data["logo"])

        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.name, "Iron Gym Pro")
        self.assertEqual(self.tenant.slug, "iron-gym-pro")
        self.assertEqual(self.tenant.website, "https://irongym.example.com")
        self.assertEqual(self.tenant.gstin, "22AAAAA0000A1Z5")
        self.assertTrue(self.tenant.logo.name)
