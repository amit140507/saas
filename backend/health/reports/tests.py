from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.tenants.models import OrganizationMember, Role
from core.tenants.services import create_tenant
from health.reports.models import BloodReport


User = get_user_model()


@override_settings(DEBUG=True)
class BloodReportViewSetTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.tenant = create_tenant(user=self.owner, name="Iron Gym")
        self.client_profile = self._create_client_profile("client", self.tenant)

    def _create_client_profile(self, username, tenant):
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123!",
        )
        role = Role.objects.get(tenant=tenant, name="client")
        member = OrganizationMember.objects.create(tenant=tenant, user=user, role=role)
        return ClientProfile.objects.create(
            tenant=tenant,
            org_client=member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )

    def _report_ids(self, response):
        payload = response.data["results"] if "results" in response.data else response.data
        return {item["id"] for item in payload}

    def test_superuser_can_list_tenant_reports_without_membership(self):
        superuser = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="StrongPass123!",
        )
        report = BloodReport.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            report_date=date(2026, 7, 30),
            lab_name="City Diagnostics",
        )

        self.api_client.force_authenticate(user=superuser)
        response = self.api_client.get(
            "/api/v1/reports/blood-reports/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._report_ids(response), {str(report.id)})

    def test_list_can_filter_reports_by_client(self):
        other_client = self._create_client_profile("other-client", self.tenant)
        matching_report = BloodReport.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            report_date=date(2026, 7, 30),
            lab_name="City Diagnostics",
        )
        BloodReport.objects.create(
            tenant=self.tenant,
            client=other_client,
            report_date=date(2026, 7, 31),
            lab_name="Town Diagnostics",
        )

        self.api_client.force_authenticate(user=self.owner)
        response = self.api_client.get(
            f"/api/v1/reports/blood-reports/?client={self.client_profile.id}",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._report_ids(response), {str(matching_report.id)})

    def test_client_create_infers_client_and_accepts_portal_aliases(self):
        self.api_client.force_authenticate(user=self.client_profile.user)

        response = self.api_client.post(
            "/api/v1/reports/blood-reports/",
            {
                "date": "2026-07-30",
                "lab_name": "City Diagnostics",
                "readings": '[{"marker_name":"HbA1c","value":"5.400","unit":"%"}]',
            },
            format="multipart",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 201)
        report = BloodReport.objects.get(id=response.data["id"])
        self.assertEqual(report.client, self.client_profile)
        self.assertEqual(report.markers.count(), 1)
