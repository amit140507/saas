"""
Orders Celery tasks.
TODO: Rebuild invoice/PDF generation task using the new Order/Payment schema.
The old tasks referenced the removed Invoice model.
"""
from celery import shared_task
from orders.models import Order


@shared_task
def placeholder_order_task(order_id):
    """Placeholder — replace with real invoice/notification logic."""
    return {'ok': True, 'order_id': str(order_id)}
