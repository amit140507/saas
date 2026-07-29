from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.staff.models import StaffProfile
from core.tenants.models import OrganizationMember, Role
from core.tenants.services import create_tenant
from progress.measurement.models import WeeklyMeasurement


User = get_user_model()


@override_settings(DEBUG=True)
class WeeklyMeasurementViewSetTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.tenant = create_tenant(user=self.owner, name="Iron Gym")

        self.other_owner = User.objects.create_user(
            username="other-owner",
            email="other-owner@example.com",
            password="StrongPass123!",
        )
        self.other_tenant = create_tenant(user=self.other_owner, name="Other Gym")

        self.client_profile = self._create_client_profile("client", self.tenant)
        self.second_client_profile = self._create_client_profile("second-client", self.tenant)
        self.other_client_profile = self._create_client_profile("other-client", self.other_tenant)

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

    def _create_staff_profile(self, username, tenant):
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123!",
        )
        role = Role.objects.get(tenant=tenant, name="trainer")
        member = OrganizationMember.objects.create(tenant=tenant, user=user, role=role)
        staff = StaffProfile.objects.create(tenant=tenant, org_staff=member)
        return user, staff

    def _measurement_ids(self, response):
        payload = response.data["results"] if "results" in response.data else response.data
        return {item["id"] for item in payload}

    def test_list_returns_only_current_tenant_measurements(self):
        tenant_measurement = WeeklyMeasurement.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            weight="80.50",
            chest="102.00",
        )
        WeeklyMeasurement.objects.create(
            tenant=self.other_tenant,
            client=self.other_client_profile,
            weight="70.00",
        )

        self.api_client.force_authenticate(user=self.owner)
        response = self.api_client.get(
            "/api/v1/progress/weekly-measurements/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._measurement_ids(response), {str(tenant_measurement.id)})

    def test_client_filter_returns_measurements_for_selected_client(self):
        selected_measurement = WeeklyMeasurement.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            weight="80.50",
        )
        WeeklyMeasurement.objects.create(
            tenant=self.tenant,
            client=self.second_client_profile,
            weight="75.25",
        )

        self.api_client.force_authenticate(user=self.owner)
        response = self.api_client.get(
            "/api/v1/progress/weekly-measurements/",
            {"client": str(self.client_profile.id)},
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._measurement_ids(response), {str(selected_measurement.id)})

    def test_client_filter_excludes_cross_tenant_measurements(self):
        WeeklyMeasurement.objects.create(
            tenant=self.other_tenant,
            client=self.other_client_profile,
            weight="70.00",
        )

        self.api_client.force_authenticate(user=self.owner)
        response = self.api_client.get(
            "/api/v1/progress/weekly-measurements/",
            {"client": str(self.other_client_profile.id)},
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._measurement_ids(response), set())

    def test_trainer_sees_only_assigned_client_measurements(self):
        trainer_user, trainer = self._create_staff_profile("trainer", self.tenant)
        self.client_profile.assigned_trainer = trainer
        self.client_profile.save(update_fields=["assigned_trainer"])

        assigned_measurement = WeeklyMeasurement.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            weight="80.50",
        )
        WeeklyMeasurement.objects.create(
            tenant=self.tenant,
            client=self.second_client_profile,
            weight="75.25",
        )

        self.api_client.force_authenticate(user=trainer_user)
        response = self.api_client.get(
            "/api/v1/progress/weekly-measurements/",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._measurement_ids(response), {str(assigned_measurement.id)})
