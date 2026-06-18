import json
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from billing.invoices.models import Invoice
from billing.orders.models import Order
from billing.packages.models import Package, PackagePlan
from billing.subscriptions.models import Membership, PlanDeliveryTask
from engagement.communications.models import EmailLog
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember

from .gateway import GatewayFactory, RazorpayAdapter
from .models import CheckoutIntent, Payment, PaymentGatewayConfig
from .services import build_payment_link_url
from billing.subscriptions.models import MembershipSnapshot


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
        create_payload = client_instance.order.create.call_args.kwargs["data"]
        self.assertEqual(intent.client, self.client_profile)
        self.assertEqual(intent.provider_order_id, "order_test_123")
        self.assertEqual(intent.order_snapshot["items"][0]["product_id"], str(self.plan.id))
        self.assertEqual(create_payload["receipt"], f"intent_{intent.id.hex}")
        self.assertLessEqual(len(create_payload["receipt"]), 40)

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
        self.package.package_type = Package.PackageTypeChoices.ONLINE
        self.package.save(update_fields=["package_type"])
        self.plan.plan_delivery_days = 3
        self.plan.save(update_fields=["plan_delivery_days"])

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
        self.assertEqual(Membership.objects.count(), 1)
        self.assertEqual(PlanDeliveryTask.objects.count(), 1)

        order = Order.objects.get()
        invoice = Invoice.objects.get()
        payment = Payment.objects.get()
        intent.refresh_from_db()

        self.assertEqual(order.status, Order.StatusChoices.CONFIRMED)
        self.assertEqual(order.payment_method, "payment_link")
        self.assertEqual(payment.gateway_payment_id, "pay_123")
        self.assertEqual(invoice.status, Invoice.StatusChoices.PAID)
        self.assertEqual(intent.order, order)
        self.assertEqual(intent.status, CheckoutIntent.StatusChoices.PAID)

        membership = Membership.objects.get()
        self.assertEqual(membership.order, order)
        self.assertEqual(membership.client, self.client_profile)

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

    def test_admin_cash_payment_creates_paid_order_payment_invoice_and_membership(self):
        self.package.package_type = Package.PackageTypeChoices.ONLINE
        self.package.save(update_fields=["package_type"])
        self.plan.plan_delivery_days = 2
        self.plan.save(update_fields=["plan_delivery_days"])

        self.api_client.force_authenticate(self.admin_user)
        response = self.api_client.post(
            "/api/v1/payments/admin-cash-payments/",
            {
                "client": str(self.client_profile.id),
                "coupon": None,
                "notes": "Paid at front desk",
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
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(Membership.objects.count(), 1)
        self.assertEqual(PlanDeliveryTask.objects.count(), 1)

        order = Order.objects.get()
        payment = Payment.objects.get()
        invoice = Invoice.objects.get()
        membership = Membership.objects.get()

        self.assertEqual(order.status, Order.StatusChoices.CONFIRMED)
        self.assertEqual(order.payment_method, "cash")
        self.assertEqual(payment.gateway, Payment.GatewayChoices.CASH)
        self.assertEqual(payment.status, Payment.StatusChoices.SUCCESS)
        self.assertEqual(invoice.status, Invoice.StatusChoices.PAID)
        self.assertEqual(membership.order, order)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="billing@example.com",
    )
    def test_admin_cash_payment_sends_order_success_email(self):
        self.package.package_type = Package.PackageTypeChoices.ONLINE
        self.package.save(update_fields=["package_type"])

        def set_invoice_url(invoice):
            invoice.pdf_url = "https://cdn.example.com/invoices/INV-TEST.pdf"
            invoice.storage_key = "invoices/INV-TEST.pdf"
            invoice.save(update_fields=["pdf_url", "storage_key", "updated_at"])
            return invoice

        self.api_client.force_authenticate(self.admin_user)
        with patch("billing.payments.services.InvoiceService.generate_invoice_pdf", side_effect=set_invoice_url):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.api_client.post(
                    "/api/v1/payments/admin-cash-payments/",
                    {
                        "client": str(self.client_profile.id),
                        "coupon": None,
                        "notes": "Paid at front desk",
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
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        order = Order.objects.get()
        self.assertEqual(email.to, [self.client_user.email])
        self.assertEqual(email.from_email, "billing@example.com")
        self.assertIn(order.order_number, email.subject)
        self.assertIn(order.order_number, email.body)
        self.assertIn("cash", email.body)
        self.assertIn("INR 1999.00", email.body)
        self.assertIn("Gold - 3 Months", email.body)
        self.assertIn("https://cdn.example.com/invoices/INV-TEST.pdf", email.body)
        email_log = EmailLog.objects.get()
        self.assertEqual(email_log.tenant, self.tenant)
        self.assertEqual(email_log.recipient, self.client_user)
        self.assertEqual(email_log.recipient_email, self.client_user.email)
        self.assertEqual(email_log.status, EmailLog.StatusChoices.SENT)
        self.assertEqual(email_log.template_name, "payments/emails/order_success")
        self.assertEqual(email_log.related_object_type, "billing.order")
        self.assertEqual(email_log.related_object_id, str(order.id))
        self.assertEqual(email_log.context_data["order_number"], order.order_number)
        self.assertEqual(email_log.context_data["invoice_url"], "https://cdn.example.com/invoices/INV-TEST.pdf")
        self.assertIsNotNone(email_log.sent_at)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="billing@example.com",
    )
    @patch("billing.payments.services.EmailMessage.send", side_effect=RuntimeError("SMTP down"))
    def test_order_success_email_failure_does_not_break_paid_order_creation(self, _send):
        self.api_client.force_authenticate(self.admin_user)

        with patch("billing.payments.services.InvoiceService.generate_invoice_pdf", return_value=None):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.api_client.post(
                    "/api/v1/payments/admin-cash-payments/",
                    {
                        "client": str(self.client_profile.id),
                        "coupon": None,
                        "notes": "Paid at front desk",
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
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(Membership.objects.count(), 1)
        email_log = EmailLog.objects.get()
        self.assertEqual(email_log.status, EmailLog.StatusChoices.FAILED)
        self.assertIn("SMTP down", email_log.error_message)
        self.assertIsNone(email_log.sent_at)

    def test_admin_manual_payment_accepts_supported_methods(self):
        self.api_client.force_authenticate(self.admin_user)
        supported_methods = ["cash", "upi", "card", "bank_transfer", "pos"]

        for payment_method in supported_methods:
            with self.subTest(payment_method=payment_method):
                response = self.api_client.post(
                    "/api/v1/payments/admin-manual-payments/",
                    {
                        "client": str(self.client_profile.id),
                        "coupon": None,
                        "notes": f"Paid by {payment_method}",
                        "payment_method": payment_method,
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
                order = Order.objects.get(id=response.data["order_id"])
                payment = order.payments.get()
                self.assertEqual(order.status, Order.StatusChoices.CONFIRMED)
                self.assertEqual(order.payment_method, payment_method)
                self.assertEqual(payment.gateway, payment_method)
                self.assertEqual(payment.status, Payment.StatusChoices.SUCCESS)

    def test_admin_manual_payment_membership_snapshot_uses_json_safe_ids(self):
        self.package.package_type = Package.PackageTypeChoices.ONLINE
        self.package.save(update_fields=["package_type"])

        self.api_client.force_authenticate(self.admin_user)
        response = self.api_client.post(
            "/api/v1/payments/admin-manual-payments/",
            {
                "client": str(self.client_profile.id),
                "coupon": None,
                "notes": "Snapshot serialization check",
                "payment_method": "cash",
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
        snapshot = MembershipSnapshot.objects.get()
        self.assertEqual(snapshot.data["package"], str(self.package.id))
        self.assertEqual(snapshot.data["package_details"]["id"], str(self.package.id))

    def test_admin_manual_payment_rejects_razorpay_flow_methods(self):
        self.api_client.force_authenticate(self.admin_user)

        for payment_method in ["payment_link", "checkout"]:
            with self.subTest(payment_method=payment_method):
                response = self.api_client.post(
                    "/api/v1/payments/admin-manual-payments/",
                    {
                        "client": str(self.client_profile.id),
                        "coupon": None,
                        "notes": "Wrong manual method",
                        "payment_method": payment_method,
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

                self.assertEqual(response.status_code, 400)

    @override_settings(PAYMENT_LINK_BASE_URL="")
    def test_build_payment_link_url_uses_named_backend_route_by_default(self):
        token = "ba0b5f5d-f773-4153-ba5b-29d6b81ade69"

        self.assertEqual(
            build_payment_link_url(token),
            f"/api/v1/payments/payment-links/{token}/",
        )

    @override_settings(PAYMENT_LINK_BASE_URL="https://pay.example.com")
    def test_build_payment_link_url_supports_configured_public_base_url(self):
        token = "ba0b5f5d-f773-4153-ba5b-29d6b81ade69"

        self.assertEqual(
            build_payment_link_url(token),
            f"https://pay.example.com/api/v1/payments/payment-links/{token}/",
        )
