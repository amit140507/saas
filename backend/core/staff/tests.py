from django.core import mail
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError

from core.staff.services import create_staff_member, set_staff_status, update_staff_member
from core.tenants.models import OrganizationMember, Role, Tenant

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://app.example.com",
    REST_AUTH={
        "PASSWORD_RESET_CONFIRM_URL": "https://app.example.com/reset-password/{uid}/{token}/",
    },
)
class StaffServiceTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Iron Gym", slug="iron-gym")
        Role.objects.create(
            tenant=self.tenant,
            name="trainer",
            code="trainer",
        )

    def test_create_staff_member_sends_activation_email(self):
        with self.captureOnCommitCallbacks(execute=True):
            staff = create_staff_member(
                self.tenant,
                {
                    "email": "coach@example.com",
                    "username": "coach@example.com",
                    "first_name": "Casey",
                    "last_name": "Coach",
                },
                {"phone": "+1234567890"},
                "trainer",
            )

        self.assertEqual(staff.user.email, "coach@example.com")
        self.assertFalse(staff.user.has_usable_password())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["coach@example.com"])
        self.assertIn("Activate your staff account", mail.outbox[0].subject)
        self.assertIn("https://app.example.com/reset-password/", mail.outbox[0].body)
        self.assertIn("Iron Gym", mail.outbox[0].body)

    def test_update_staff_member_rejects_duplicate_email(self):
        staff = create_staff_member(
            self.tenant,
            {
                "email": "coach@example.com",
                "username": "coach@example.com",
                "first_name": "Casey",
                "last_name": "Coach",
            },
            {},
            "trainer",
        )
        User.objects.create_user(
            username="amitsingh@yopmail.com",
            email="amitsingh@yopmail.com",
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Email already exists. Use a different email id.",
        ):
            update_staff_member(
                staff,
                {"email": "amitsingh@yopmail.com", "username": "amitsingh@yopmail.com"},
                {},
            )

    def test_set_staff_status_updates_tenant_membership(self):
        staff = create_staff_member(
            self.tenant,
            {
                "email": "coach@example.com",
                "username": "coach@example.com",
                "first_name": "Casey",
                "last_name": "Coach",
            },
            {},
            "trainer",
        )

        set_staff_status(staff, OrganizationMember.StatusChoices.INACTIVE)
        staff.org_staff.refresh_from_db()
        self.assertEqual(staff.org_staff.status, OrganizationMember.StatusChoices.INACTIVE)

        set_staff_status(staff, OrganizationMember.StatusChoices.ACTIVE)
        staff.org_staff.refresh_from_db()
        self.assertEqual(staff.org_staff.status, OrganizationMember.StatusChoices.ACTIVE)
