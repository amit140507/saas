"""Generate order invoice HTML/PDF and upload to Cloudflare R2 (S3-compatible)."""

from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from orders.models import Order


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


def build_invoice_context(order: Order) -> dict:
    user = order.user
    plan = order.product
    product = plan.product
    customer_name = f'{user.first_name} {user.last_name}'.strip() or user.username
    line_description = f'{product.name} — {plan.name}'
    return {
        'order': order,
        'invoice_title': 'Invoice',
        'invoice_number': f'INV-{order.id:08d}',
        'issued_at': timezone.now(),
        'customer_name': customer_name,
        'customer_email': user.email or '',
        'line_description': line_description,
        'subtotal': order.subtotal,
        'discount': order.discount,
        'total': order.total,
        'currency': getattr(settings, 'INVOICE_CURRENCY_LABEL', 'USD'),
        'has_discount': order.discount and order.discount > 0,
    }


def render_invoice_html(order: Order) -> str:
    context = build_invoice_context(order)
    return render_to_string('orders/invoice.html', context)


def html_to_pdf_bytes(html_string: str) -> bytes:
    bd = getattr(settings, 'BASE_DIR', '.')
    base_url = bd.as_posix() if isinstance(bd, Path) else str(bd)
    return HTML(string=html_string, base_url=base_url).write_pdf()


def _public_url_for_key(storage_key: str) -> str:
    """Return HTTPS URL if R2_PUBLIC_BASE_URL is set (e.g. custom domain or r2.dev); else empty."""
    base = (getattr(settings, 'R2_PUBLIC_BASE_URL', '') or '').rstrip('/')
    if base:
        return f'{base}/{storage_key}'
    return ''


def upload_invoice_pdf(storage_key: str, pdf_bytes: bytes) -> str:
    bucket = getattr(settings, 'R2_BUCKET_NAME', '') or ''
    if not bucket:
        raise RuntimeError('R2_BUCKET_NAME is not set.')
    client = _r2_client()
    client.put_object(
        Bucket=bucket,
        Key=storage_key,
        Body=pdf_bytes,
        ContentType='application/pdf',
    )
    return _public_url_for_key(storage_key)


def make_storage_key(order: Order) -> str:
    prefix = (getattr(settings, 'R2_INVOICE_KEY_PREFIX', 'invoices') or 'invoices').strip('/')
    unique = uuid.uuid4().hex[:12]
    return f'{prefix}/order-{order.pk}-{unique}.pdf'


def generate_and_upload_invoice(order: Order) -> dict:
    """
    Render PDF for order, upload to R2, return invoice_number, storage_key, pdf_url, pdf_bytes length.
    """
    html = render_invoice_html(order)
    pdf_bytes = html_to_pdf_bytes(html)
    storage_key = make_storage_key(order)
    ctx = build_invoice_context(order)
    invoice_number = ctx['invoice_number']
    pdf_url = upload_invoice_pdf(storage_key, pdf_bytes)
    return {
        'invoice_number': invoice_number,
        'storage_key': storage_key,
        'pdf_url': pdf_url or '',
    }
