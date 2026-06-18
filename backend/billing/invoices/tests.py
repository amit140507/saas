from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from billing.invoices.models import Invoice
from billing.invoices.services import InvoiceService
from billing.orders.models import Order, OrderItem
from billing.packages.models import Package, PackagePlan
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember


User = get_user_model()


class InvoiceServiceTests(TestCase):
    def setUp(self):
        self.tenant = Organization.objects.create(name='Fit Gym', slug='fit-gym')
        self.user = User.objects.create_user(
            username='client1',
            email='client@example.com',
            password='pass1234',
            first_name='Client',
            last_name='Example',
        )
        self.member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.user,
            status=OrganizationMember.StatusChoices.ACTIVE,
        )
        self.client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        self.package = Package.objects.create(
            tenant=self.tenant,
            name='Gold',
            is_active=True,
        )
        self.plan = PackagePlan.objects.create(
            tenant=self.tenant,
            package=self.package,
            name='3 Months',
            price=Decimal('1999.00'),
            is_active=True,
        )
        self.order = Order.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            status=Order.StatusChoices.CONFIRMED,
            payment_method='cash',
            subtotal=Decimal('1999.00'),
            discount_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('1999.00'),
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.plan,
            quantity=1,
            unit_price=Decimal('1999.00'),
            total_price=Decimal('1999.00'),
        )

    @override_settings(
        R2_ACCOUNT_ID='account123',
        R2_ACCESS_KEY_ID='access123',
        R2_SECRET_ACCESS_KEY='secret123',
        R2_BUCKET_NAME='invoice-bucket',
        R2_ENDPOINT_URL='',
        R2_REGION='auto',
        R2_INVOICE_KEY_PREFIX='invoices',
        R2_PUBLIC_BASE_URL='https://cdn.example.com',
        INVOICE_CURRENCY_LABEL='INR',
    )
    @patch('boto3.client')
    def test_generate_invoice_pdf_uploads_to_r2_and_stores_public_url(self, boto3_client):
        invoice = InvoiceService.generate_from_order(self.order)

        updated_invoice = InvoiceService.generate_invoice_pdf(invoice)

        expected_key = f'invoices/{self.tenant.id}/{invoice.invoice_number}.pdf'
        uploaded_body = boto3_client.return_value.put_object.call_args.kwargs['Body']
        boto3_client.assert_called_once()
        boto3_client.return_value.put_object.assert_called_once_with(
            Bucket='invoice-bucket',
            Key=expected_key,
            Body=uploaded_body,
            ContentType='application/pdf',
        )
        self.assertTrue(uploaded_body.startswith(b'%PDF'))
        self.assertEqual(updated_invoice.storage_key, expected_key)
        self.assertEqual(updated_invoice.pdf_url, f'https://cdn.example.com/{expected_key}')
        self.assertEqual(updated_invoice.status, Invoice.StatusChoices.ISSUED)
        self.assertIsNotNone(updated_invoice.generated_at)

    @override_settings(
        R2_ACCOUNT_ID='account123',
        R2_ACCESS_KEY_ID='access123',
        R2_SECRET_ACCESS_KEY='secret123',
        R2_BUCKET_NAME='invoice-bucket',
        R2_PUBLIC_BASE_URL='',
    )
    @patch('boto3.client')
    def test_generate_invoice_pdf_keeps_url_blank_without_public_base_url(self, boto3_client):
        invoice = InvoiceService.generate_from_order(self.order)

        updated_invoice = InvoiceService.generate_invoice_pdf(invoice)

        boto3_client.return_value.put_object.assert_called_once()
        self.assertEqual(updated_invoice.pdf_url, '')
        self.assertTrue(updated_invoice.storage_key.endswith(f'/{invoice.invoice_number}.pdf'))

    @override_settings(
        R2_ACCOUNT_ID='',
        R2_ACCESS_KEY_ID='',
        R2_SECRET_ACCESS_KEY='',
        R2_BUCKET_NAME='invoice-bucket',
    )
    def test_generate_invoice_pdf_raises_clear_error_without_r2_credentials(self):
        invoice = InvoiceService.generate_from_order(self.order)

        with self.assertRaisesMessage(RuntimeError, 'R2 is not configured'):
            InvoiceService.generate_invoice_pdf(invoice)

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.StatusChoices.DRAFT)
        self.assertIsNone(invoice.storage_key)
        self.assertIsNone(invoice.pdf_url)
