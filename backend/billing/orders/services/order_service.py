from django.db import transaction

from billing.orders.models import Order, OrderItem


class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order_with_items(order_data, items_data):
        order = Order.objects.create(**order_data)
        OrderItem.objects.bulk_create(
            OrderItem(order=order, **item_data)
            for item_data in items_data
        )
        return order

    @staticmethod
    @transaction.atomic
    def update_order_with_items(order, order_data, items_data=None):
        for field, value in order_data.items():
            setattr(order, field, value)
        order.save()

        if items_data is not None:
            order.items.all().delete()
            OrderItem.objects.bulk_create(
                OrderItem(order=order, **item_data)
                for item_data in items_data
            )

        return order

    @staticmethod
    def mark_as_paid(order):
        if order.status == Order.StatusChoices.CONFIRMED:
            return

        order.status = Order.StatusChoices.CONFIRMED
        order.save()
