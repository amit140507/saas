from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from billing.packages.models import Package, PackagePlan
from billing.subscriptions.models import Membership
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from engagement.followups.models import Followup


User = get_user_model()


class FollowupApiTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Organization.objects.create(name="Fit Gym", slug="fit-gym")
        self.other_tenant = Organization.objects.create(name="Other Gym", slug="other-gym")
        self.user = User.objects.create_user(username="owner", email="owner@example.com", password="pass1234")
        OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        self.client_user = User.objects.create_user(username="client", email="client@example.com", password="pass1234")
        self.client_member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        self.client = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.client_member,
            status=ClientProfile.StatusChoices.LEAD,
            phone="+919999999999",
        )

    def tenant_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.tenant.id)}

    def test_followups_are_scoped_to_request_tenant(self):
        Followup.objects.create(
            tenant=self.tenant,
            client=self.client,
            created_by=self.user,
            followup_type=Followup.FollowupType.WHATSAPP,
        )
        other_user = User.objects.create_user(username="other-client", email="other@example.com", password="pass1234")
        other_member = OrganizationMember.objects.create(
            tenant=self.other_tenant,
            user=other_user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        other_client = ClientProfile.objects.create(
            tenant=self.other_tenant,
            org_client=other_member,
            status=ClientProfile.StatusChoices.LEAD,
        )
        Followup.objects.create(
            tenant=self.other_tenant,
            client=other_client,
            followup_type=Followup.FollowupType.EMAIL,
        )

        self.api_client.force_authenticate(self.user)
        response = self.api_client.get("/api/v1/engagement/followups/", **self.tenant_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["client"], str(self.client.id))

    def test_suggested_targets_include_leads_and_expiring_memberships(self):
        package = Package.objects.create(tenant=self.tenant, name="Gold")
        plan = PackagePlan.objects.create(
            tenant=self.tenant,
            package=package,
            name="Monthly",
            price="1000.00",
            duration_in_days=30,
        )
        today = timezone.localdate()
        Membership.objects.create(
            tenant=self.tenant,
            client=self.client,
            plan=plan,
            start_date=today - timedelta(days=23),
            base_end_date=today + timedelta(days=7),
            extended_end_date=today + timedelta(days=7),
            status=Membership.StatusChoices.ACTIVE,
        )

        self.api_client.force_authenticate(self.user)
        response = self.api_client.get(
            "/api/v1/engagement/followups/suggested-targets/",
            **self.tenant_headers(),
        )

        self.assertEqual(response.status_code, 200)
        reasons = {item["reason"] for item in response.data}
        self.assertIn("lead", reasons)
        self.assertIn("expiring_soon", reasons)
