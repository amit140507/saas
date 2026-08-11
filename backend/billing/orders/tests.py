from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.test import TestCase

from billing.orders.models import Order
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember

User = get_user_model()


class OrderViewSetTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Organization.objects.create(name="Fit Gym", slug="fit-gym")
        self.other_tenant = Organization.objects.create(name="Other Gym", slug="other-gym")
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password",
        )
        OrganizationMember.objects.create(user=self.admin_user, tenant=self.tenant, is_owner=True)
        self.client_profile = self._create_client_profile("client-one", self.tenant)
        self.second_client_profile = self._create_client_profile("client-two", self.tenant)
        self.other_client_profile = self._create_client_profile("other-client", self.other_tenant)

    def tenant_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.tenant.id)}

    def _create_client_profile(self, username, tenant):
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="password",
        )
        member = OrganizationMember.objects.create(user=user, tenant=tenant)
        return ClientProfile.objects.create(
            tenant=tenant,
            org_client=member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )

    def _create_order(self, client_profile, suffix):
        return Order.objects.create(
            tenant=client_profile.tenant,
            client=client_profile,
            order_number=f"ORD-{suffix}",
            status=Order.StatusChoices.CONFIRMED,
            subtotal=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("100.00"),
        )

    def test_client_filter_returns_only_current_tenant_client_orders(self):
        matching_order = self._create_order(self.client_profile, "MATCH")
        self._create_order(self.second_client_profile, "OTHER")
        self._create_order(self.other_client_profile, "CROSS")

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get(
            f"/api/v1/orders/orders/?client={self.client_profile.id}",
            **self.tenant_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([order["id"] for order in response.data], [str(matching_order.id)])
