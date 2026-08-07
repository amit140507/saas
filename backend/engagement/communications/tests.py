from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from engagement.communications.models import EmailLog, MessageTemplate


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

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", DEFAULT_FROM_EMAIL="gym@example.com")
    def test_message_template_test_send_creates_email_log(self):
        client_user = User.objects.create_user(
            username="client",
            email="client@example.com",
            password="pass1234",
        )
        member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=client_user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        client = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=member,
            status=ClientProfile.StatusChoices.ACTIVE,
            phone="+919999999999",
        )
        template = MessageTemplate.objects.create(
            tenant=self.tenant,
            created_by=self.user,
            name="Renewal Reminder",
            channel=MessageTemplate.ChannelChoices.EMAIL,
            category=MessageTemplate.CategoryChoices.RENEWAL_REMINDER,
            subject="Hi {{ client_name }}",
            body="Your package is ending soon.",
            variables=["client_name"],
        )

        self.api_client.force_authenticate(self.user)
        response = self.api_client.post(
            f"/api/v1/communications/message-templates/{template.id}/test-send/",
            {"recipient_id": str(client.id), "context_data": {"client_name": "Demo Client"}},
            format="json",
            **self.tenant_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(EmailLog.objects.filter(
            tenant=self.tenant,
            recipient=client_user,
            template_name="Renewal Reminder",
            status=EmailLog.StatusChoices.SENT,
        ).exists())
