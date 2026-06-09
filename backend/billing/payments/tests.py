import json
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from billing.invoices.models import Invoice
from billing.orders.models import Order
from billing.packages.models import Package, PackagePlan
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember

from .gateway import GatewayFactory, RazorpayAdapter
from .models import CheckoutIntent, Payment, PaymentGatewayConfig


User = get_user_model()


class PaymentFlowTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Organization.objects.create(name="Fit Gym", slug="fit-gym")

        self.client_user = User.objects.create_user(
            username="client1",
            email="client@example.com",
            password="pass1234",
        )
        self.client_member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        self.client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.client_member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )

        self.admin_user = User.objects.create_superuser(
            username="admin1",
            email="admin@example.com",
            password="pass1234",
        )

        self.package = Package.objects.create(
            tenant=self.tenant,
            name="Gold",
            is_active=True,
        )
        self.plan = PackagePlan.objects.create(
            tenant=self.tenant,
            package=self.package,
            name="3 Months",
            price=Decimal("1999.00"),
            duration_in_days=90,
            is_active=True,
        )

    def tenant_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.tenant.id)}

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="env_key",
        RAZORPAY_KEY_SECRET="env_secret",
        RAZORPAY_WEBHOOK_SECRET="env_hook",
    )
    def test_factory_uses_tenant_config_before_env_default(self):
        PaymentGatewayConfig.objects.create(
            tenant=self.tenant,
            provider_name="razorpay",
            api_key="tenant_key",
            api_secret="tenant_secret",
            webhook_secret="tenant_hook",
            is_active=True,
        )

        adapter = GatewayFactory.get_adapter(self.tenant)

        self.assertIsInstance(adapter, RazorpayAdapter)
        self.assertEqual(adapter.api_key, "tenant_key")
        self.assertEqual(adapter.api_secret, "tenant_secret")
        self.assertEqual(adapter.webhook_secret, "tenant_hook")

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="",
        RAZORPAY_KEY_SECRET="",
        RAZORPAY_WEBHOOK_SECRET="",
    )
    def test_factory_raises_clear_error_without_config(self):
        with self.assertRaisesMessage(ValueError, "No active payment gateway is configured."):
            GatewayFactory.get_adapter(self.tenant)

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="rzp_test_key",
        RAZORPAY_KEY_SECRET="rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET="rzp_hook_secret",
    )
    def test_create_checkout_intent_returns_provider_order_data(self):
        self.api_client.force_authenticate(self.client_user)
        with patch("billing.payments.gateway.razorpay.Client") as client_class:
            client_instance = client_class.return_value
            client_instance.order.create.return_value = {
                "id": "order_test_123",
                "amount": 199900,
                "currency": "INR",
            }

            response = self.api_client.post(
                "/api/v1/payments/checkout-intents/",
                {"plan_id": str(self.plan.id)},
                format="json",
                **self.tenant_headers(),
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["provider_order_id"], "order_test_123")
        self.assertEqual(response.data["amount"], 199900)
        intent = CheckoutIntent.objects.get(id=response.data["intent_id"])
        self.assertEqual(intent.client, self.client_profile)
        self.assertEqual(intent.provider_order_id, "order_test_123")
        self.assertEqual(intent.order_snapshot["items"][0]["product_id"], str(self.plan.id))

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="rzp_test_key",
        RAZORPAY_KEY_SECRET="rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET="rzp_hook_secret",
    )
    def test_webhook_rejects_invalid_signature(self):
        intent = CheckoutIntent.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            source=CheckoutIntent.SourceChoices.USER_CHECKOUT,
            status=CheckoutIntent.StatusChoices.PROCESSING,
            gateway="razorpay",
            provider_order_id="order_invalid_1",
            amount=Decimal("1999.00"),
            currency="INR",
            order_snapshot={
                "client_id": str(self.client_profile.id),
                "subtotal": "1999.00",
                "discount_amount": "0.00",
                "tax_amount": "0.00",
                "total_amount": "1999.00",
                "notes": "",
                "items": [{
                    "product_id": str(self.plan.id),
                    "package_name": self.package.name,
                    "plan_name": self.plan.name,
                    "quantity": 1,
                    "unit_price": "1999.00",
                    "total_price": "1999.00",
                }],
            },
        )

        fake_adapter = Mock()
        fake_adapter.verify_webhook.side_effect = ValueError("Signature verification failed.")
        with patch("billing.payments.views.GatewayFactory.get_adapter", return_value=fake_adapter):
            response = self.api_client.post(
                "/api/v1/payments/webhooks/razorpay/",
                data=json.dumps({
                    "payload": {"payment": {"entity": {"order_id": intent.provider_order_id}}},
                }),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Payment.objects.count(), 0)

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="rzp_test_key",
        RAZORPAY_KEY_SECRET="rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET="rzp_hook_secret",
    )
    def test_successful_webhook_is_idempotent_and_creates_order_payment_invoice(self):
        intent = CheckoutIntent.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            source=CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK,
            status=CheckoutIntent.StatusChoices.PROCESSING,
            gateway="razorpay",
            provider_order_id="order_paid_1",
            amount=Decimal("1999.00"),
            currency="INR",
            order_snapshot={
                "client_id": str(self.client_profile.id),
                "client_name": "Client Example",
                "client_email": "client@example.com",
                "coupon_id": None,
                "coupon_code": "",
                "subtotal": "1999.00",
                "discount_amount": "0.00",
                "tax_amount": "0.00",
                "total_amount": "1999.00",
                "notes": "",
                "items": [{
                    "product_id": str(self.plan.id),
                    "package_name": self.package.name,
                    "plan_name": self.plan.name,
                    "quantity": 1,
                    "unit_price": "1999.00",
                    "total_price": "1999.00",
                }],
            },
        )

        normalized_event = {
            "event_type": "payment.captured",
            "provider_order_id": intent.provider_order_id,
            "provider_payment_id": "pay_123",
            "status": "captured",
            "amount": 199900,
            "raw_payload": {
                "event": "payment.captured",
                "payload": {"payment": {"entity": {"order_id": intent.provider_order_id, "id": "pay_123"}}},
            },
        }
        fake_adapter = Mock()
        fake_adapter.verify_webhook.return_value = normalized_event

        with patch("billing.payments.views.GatewayFactory.get_adapter", return_value=fake_adapter):
            response_one = self.api_client.post(
                "/api/v1/payments/webhooks/razorpay/",
                data=json.dumps(normalized_event["raw_payload"]),
                content_type="application/json",
            )
            response_two = self.api_client.post(
                "/api/v1/payments/webhooks/razorpay/",
                data=json.dumps(normalized_event["raw_payload"]),
                content_type="application/json",
            )

        self.assertEqual(response_one.status_code, 200)
        self.assertEqual(response_two.status_code, 200)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(Invoice.objects.count(), 1)

        order = Order.objects.get()
        invoice = Invoice.objects.get()
        payment = Payment.objects.get()
        intent.refresh_from_db()

        self.assertEqual(order.status, Order.StatusChoices.CONFIRMED)
        self.assertEqual(payment.gateway_payment_id, "pay_123")
        self.assertEqual(invoice.status, Invoice.StatusChoices.PAID)
        self.assertEqual(intent.order, order)
        self.assertEqual(intent.status, CheckoutIntent.StatusChoices.PAID)

    @override_settings(
        PAYMENT_DEFAULT_GATEWAY="razorpay",
        RAZORPAY_KEY_ID="rzp_test_key",
        RAZORPAY_KEY_SECRET="rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET="rzp_hook_secret",
    )
    def test_admin_payment_link_summary_is_public_and_safe(self):
        self.api_client.force_authenticate(self.admin_user)
        response = self.api_client.post(
            "/api/v1/payments/admin-payment-links/",
            {
                "client": str(self.client_profile.id),
                "coupon": None,
                "notes": "Follow up after payment",
                "subtotal": "1999.00",
                "discount_amount": "0.00",
                "tax_amount": "0.00",
                "total_amount": "1999.00",
                "items": [
                    {
                        "product": str(self.plan.id),
                        "quantity": 1,
                        "unit_price": "1999.00",
                        "total_price": "1999.00",
                    }
                ],
            },
            format="json",
            **self.tenant_headers(),
        )
        self.assertEqual(response.status_code, 201)

        public_client = APIClient()
        summary_response = public_client.get(
            f"/api/v1/payments/payment-links/{response.data['payment_link_token']}/"
        )

        self.assertEqual(summary_response.status_code, 200)
        self.assertIn("order_snapshot", summary_response.data)
        self.assertNotIn("gateway_response", summary_response.data)
