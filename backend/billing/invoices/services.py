from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Invoice


def _r2_client():
    import boto3
    from botocore.config import Config

    account_id = getattr(settings, 'R2_ACCOUNT_ID', '') or ''
    access_key = getattr(settings, 'R2_ACCESS_KEY_ID', '') or ''
    secret_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '') or ''

    if not (account_id and access_key and secret_key):
        raise RuntimeError(
            'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.'
        )

    endpoint = getattr(settings, 'R2_ENDPOINT_URL', None) or (
        f'https://{account_id}.r2.cloudflarestorage.com'
    )

    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=getattr(settings, 'R2_REGION', 'auto'),
        config=Config(signature_version='s3v4'),
    )


def _public_url_for_key(storage_key: str) -> str:
    base_url = (getattr(settings, 'R2_PUBLIC_BASE_URL', '') or '').rstrip('/')
    return f'{base_url}/{storage_key.lstrip("/")}' if base_url else ''


def _make_storage_key(invoice: Invoice) -> str:
    prefix = (getattr(settings, 'R2_INVOICE_KEY_PREFIX', 'invoices') or 'invoices').strip('/')
    tenant_id = invoice.tenant_id or invoice.order.tenant_id
    return f'{prefix}/{tenant_id}/{invoice.invoice_number}.pdf'


def _upload_invoice_pdf(storage_key: str, pdf_bytes: bytes) -> str:
    bucket_name = getattr(settings, 'R2_BUCKET_NAME', '') or ''
    if not bucket_name:
        raise RuntimeError('R2_BUCKET_NAME is not set.')

    _r2_client().put_object(
        Bucket=bucket_name,
        Key=storage_key,
        Body=pdf_bytes,
        ContentType='application/pdf',
    )
    return _public_url_for_key(storage_key)


def _line_description(order) -> str:
    items = list(order.items.select_related('product__package'))
    descriptions = []
    for item in items:
        product = item.product
        if not product:
            descriptions.append(f'Item x {item.quantity}')
            continue

        package_name = product.package.name if product.package_id else ''
        plan_name = product.name
        label = ' - '.join(part for part in (package_name, plan_name) if part)
        if item.quantity and item.quantity > 1:
            label = f'{label} x {item.quantity}'
        descriptions.append(label)

    return ', '.join(descriptions) or f'Order {order.order_number}'


def _build_invoice_context(invoice: Invoice) -> dict:
    order = invoice.order
    client_user = order.client.user
    customer_name = client_user.get_full_name() or client_user.username
    return {
        'invoice': invoice,
        'order': order,
        'invoice_title': 'Invoice',
        'invoice_number': invoice.invoice_number,
        'issued_at': timezone.now(),
        'customer_name': customer_name,
        'customer_email': client_user.email or '',
        'line_description': _line_description(order),
        'subtotal': order.subtotal,
        'discount': order.discount_amount,
        'total': order.total_amount,
        'currency': getattr(settings, 'INVOICE_CURRENCY_LABEL', 'INR'),
        'has_discount': order.discount_amount and order.discount_amount > 0,
    }


def _money(value, currency: str) -> str:
    return f'{currency} {value}'


def _generate_invoice_pdf_bytes(context: dict) -> bytes:
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise ValidationError('fpdf2 is not installed.') from exc

    order = context['order']
    currency = context['currency']
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font('helvetica', 'B', 22)
    pdf.cell(0, 12, context['invoice_title'], new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    pdf.set_font('helvetica', '', 10)
    pdf.set_text_color(75, 85, 99)
    pdf.cell(0, 6, f"Invoice #: {context['invoice_number']}", new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 6, f"Order #: {order.id}", new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 6, f"Issued: {context['issued_at'].strftime('%Y-%m-%d %H:%M %Z')}", new_x='LMARGIN', new_y='NEXT')
    pdf.ln(7)

    pdf.set_text_color(17, 24, 39)
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 7, 'Bill to', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('helvetica', '', 10)
    pdf.cell(0, 6, context['customer_name'], new_x='LMARGIN', new_y='NEXT')
    if context['customer_email']:
        pdf.cell(0, 6, context['customer_email'], new_x='LMARGIN', new_y='NEXT')
    pdf.ln(8)

    pdf.set_font('helvetica', 'B', 10)
    pdf.set_fill_color(243, 244, 246)
    pdf.cell(135, 8, 'Description', border=1, fill=True)
    pdf.cell(45, 8, f'Amount ({currency})', border=1, align='R', new_x='LMARGIN', new_y='NEXT', fill=True)

    pdf.set_font('helvetica', '', 10)
    pdf.multi_cell(135, 8, context['line_description'], border=1, new_x='RIGHT', new_y='TOP')
    line_y = pdf.get_y()
    pdf.set_xy(155, line_y - 8)
    pdf.cell(45, 8, str(context['subtotal']), border=1, align='R', new_x='LMARGIN', new_y='NEXT')

    if context['has_discount']:
        pdf.cell(135, 8, 'Discount', border=1)
        pdf.cell(45, 8, f"-{context['discount']}", border=1, align='R', new_x='LMARGIN', new_y='NEXT')

    pdf.ln(8)
    pdf.set_x(110)
    pdf.cell(45, 7, 'Subtotal', border=0)
    pdf.cell(45, 7, _money(context['subtotal'], currency), border=0, align='R', new_x='LMARGIN', new_y='NEXT')

    if context['has_discount']:
        pdf.set_x(110)
        pdf.cell(45, 7, 'Discount', border=0)
        pdf.cell(45, 7, _money(context['discount'], currency), border=0, align='R', new_x='LMARGIN', new_y='NEXT')

    pdf.set_x(110)
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(45, 9, 'Total due', border='T')
    pdf.cell(45, 9, _money(context['total'], currency), border='T', align='R')

    return bytes(pdf.output())


class InvoiceService:
    
    @staticmethod
    @transaction.atomic
    def generate_from_order(order):
        """
        Creates a DRAFT invoice from an order.
        """
        if hasattr(order, 'invoice') and order.invoice:
            raise ValidationError("Order already has an invoice.")
            
        invoice = Invoice.objects.create(
            tenant=order.tenant,
            order=order,
            status=Invoice.StatusChoices.DRAFT
        )
        return invoice

    @staticmethod
    def generate_invoice_pdf(invoice: Invoice):
        """
        Generates a PDF for the invoice using fpdf2 and uploads it to R2.
        """
        context = _build_invoice_context(invoice)
        pdf_bytes = _generate_invoice_pdf_bytes(context)
        storage_key = _make_storage_key(invoice)

        invoice.pdf_url = _upload_invoice_pdf(storage_key, pdf_bytes)
        invoice.storage_key = storage_key
        invoice.status = Invoice.StatusChoices.ISSUED
        invoice.generated_at = timezone.now()
        invoice.save(update_fields=['pdf_url', 'storage_key', 'status', 'generated_at', 'updated_at'])
        
        return invoice

    @staticmethod
    def mark_as_paid(invoice: Invoice):
        if invoice.status == Invoice.StatusChoices.VOID:
            raise ValidationError("Cannot mark a void invoice as paid.")
        invoice.status = Invoice.StatusChoices.PAID
        invoice.save()
        return invoice

    @staticmethod
    def void_invoice(invoice: Invoice):
        invoice.status = Invoice.StatusChoices.VOID
        invoice.save()
        return invoice
