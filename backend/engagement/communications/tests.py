from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.tenants.models import Organization, OrganizationMember
from engagement.communications.models import EmailLog


User = get_user_model()


class EmailLogApiTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Organization.objects.create(name="Fit Gym", slug="fit-gym")
        self.other_tenant = Organization.objects.create(name="Other Gym", slug="other-gym")
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="pass1234",
        )
        OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )

    def tenant_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.tenant.id)}

    def test_email_logs_are_scoped_to_request_tenant(self):
        EmailLog.objects.create(
            tenant=self.tenant,
            recipient=self.user,
            recipient_email="client@example.com",
            subject="Order confirmed",
            status=EmailLog.StatusChoices.SENT,
        )
        EmailLog.objects.create(
            tenant=self.other_tenant,
            recipient_email="other@example.com",
            subject="Other order confirmed",
            status=EmailLog.StatusChoices.SENT,
        )

        self.api_client.force_authenticate(self.user)
        response = self.api_client.get(
            "/api/v1/communications/email-logs/",
            **self.tenant_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["recipient_email"], "client@example.com")
