from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from billing.packages.models import Package, PackagePlan
from billing.subscriptions.models import Membership
from core.clients.models import ClientProfile
from core.tenants.models import Organization
from core.tenants.models import OrganizationMember


User = get_user_model()


@override_settings(DEBUG=True)
class PackageViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.tenant = Organization.objects.create(name="Iron Gym", slug="iron-gym")
        self.other_tenant = Organization.objects.create(name="Other Gym", slug="other-gym")
        self.package = Package.objects.create(
            tenant=self.tenant,
            name="Gold",
            description="Gold package",
            max_freezes=5,
            is_active=True,
        )

    def test_package_list_returns_only_current_tenant_plans(self):
        PackagePlan.objects.create(
            tenant=self.tenant,
            package=self.package,
            name="Tenant Monthly",
            price="1999.00",
            duration_in_days=30,
            is_active=True,
        )
        PackagePlan.objects.create(
            tenant=self.other_tenant,
            package=self.package,
            name="Other Tenant Monthly",
            price="2999.00",
            duration_in_days=30,
            is_active=True,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            "/api/v1/packages/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(payload), 1)
        self.assertEqual(
            [plan["name"] for plan in payload[0]["plans"]],
            ["Tenant Monthly"],
        )

    def test_delete_archives_package_with_referenced_plans(self):
        plan = PackagePlan.objects.create(
            tenant=self.tenant,
            package=self.package,
            name="Tenant Monthly",
            price="1999.00",
            duration_in_days=30,
            is_active=True,
        )
        client_user = User.objects.create_user(
            username="client",
            email="client@example.com",
            password="StrongPass123!",
        )
        org_member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=client_user,
        )
        client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=org_member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        Membership.objects.create(
            tenant=self.tenant,
            client=client_profile,
            plan=plan,
            start_date=date(2026, 1, 1),
            base_end_date=date(2026, 1, 31),
            extended_end_date=date(2026, 1, 31),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            f"/api/v1/packages/{self.package.id}/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 204)
        self.package.refresh_from_db()
        plan.refresh_from_db()
        self.assertFalse(self.package.is_active)
        self.assertFalse(plan.is_active)
