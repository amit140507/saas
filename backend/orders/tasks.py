from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from orders.models import Invoice, Order
from orders.services.invoice_service import generate_and_upload_invoice


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 3},
)
def generate_invoice_task(self, order_id: int, force: bool = False):
    order = Order.objects.select_related(
        'user', 'product', 'product__product', 'coupon', 'tenant'
    ).get(pk=order_id)

    with transaction.atomic():
        invoice, _ = Invoice.objects.select_for_update().get_or_create(
            order=order,
            defaults={'tenant': order.tenant},
        )
        if (
            not force
            and invoice.status == Invoice.Status.READY
            and invoice.pdf_url
        ):
            return {'skipped': True, 'order_id': order_id}

        invoice.status = Invoice.Status.PENDING
        invoice.error_message = ''
        invoice.save(update_fields=['status', 'error_message', 'updated_at'])

    try:
        result = generate_and_upload_invoice(order)
    except Exception as exc:
        Invoice.objects.filter(pk=invoice.pk).update(
            status=Invoice.Status.FAILED,
            error_message=str(exc)[:2000],
            updated_at=timezone.now(),
        )
        raise

    Invoice.objects.filter(pk=invoice.pk).update(
        pdf_url=result['pdf_url'],
        storage_key=result['storage_key'],
        invoice_number=result['invoice_number'],
        status=Invoice.Status.READY,
        generated_at=timezone.now(),
        error_message='',
        updated_at=timezone.now(),
    )
    return {'ok': True, 'order_id': order_id, 'pdf_url': result['pdf_url']}


@shared_task
def enqueue_missing_invoice_tasks():
    """Beat/cron: queue PDF generation for paid orders missing a ready invoice."""
    ids = list(
        Order.objects.filter(status=Order.Status.PAID)
        .filter(
            Q(invoice__isnull=True)
            | ~Q(invoice__status=Invoice.Status.READY)
            | Q(invoice__pdf_url='')
        )
        .values_list('id', flat=True)
    )
    for oid in ids:
        generate_invoice_task.delay(oid)
    return {'enqueued': len(ids)}
