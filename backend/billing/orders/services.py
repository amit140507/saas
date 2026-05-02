from .models import Order

class OrderService:
    @staticmethod
    def mark_as_paid(order):
        if order.status == Order.StatusChoices.CONFIRMED:
            return

        order.status = Order.StatusChoices.CONFIRMED
        order.save()

        # future:
        # - activate membership
        # - generate invoice
        # - send email
