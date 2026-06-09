import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from billing.coupons.models import Coupon
from billing.coupons.services import CouponService
from billing.invoices.services import InvoiceService
from billing.orders.models import Order
from billing.orders.services import OrderService
from billing.packages.models import PackagePlan

from .models import CheckoutIntent, Payment


def build_payment_link_url(token):
    base_url = getattr(settings, "PAYMENT_LINK_BASE_URL", "").rstrip("/")
    return f"{base_url}/pay/{token}" if base_url else f"/pay/{token}"


def serialize_line_item(plan, quantity, unit_price, total_price):
    return {
        "product_id": str(plan.id),
        "package_name": plan.package.name,
        "plan_name": plan.name,
        "quantity": quantity,
        "unit_price": str(Decimal(unit_price).quantize(Decimal("0.01"))),
        "total_price": str(Decimal(total_price).quantize(Decimal("0.01"))),
    }


def serialize_checkout_snapshot(*, client, items, subtotal, discount_amount, tax_amount, total_amount, coupon=None, notes=""):
    return {
        "client_id": str(client.id),
        "client_name": f"{client.user.first_name} {client.user.last_name}".strip() or client.user.email,
        "client_email": client.user.email,
        "coupon_id": str(coupon.id) if coupon else None,
        "coupon_code": coupon.code if coupon else "",
        "subtotal": str(Decimal(subtotal).quantize(Decimal("0.01"))),
        "discount_amount": str(Decimal(discount_amount).quantize(Decimal("0.01"))),
        "tax_amount": str(Decimal(tax_amount).quantize(Decimal("0.01"))),
        "total_amount": str(Decimal(total_amount).quantize(Decimal("0.01"))),
        "notes": notes or "",
        "items": items,
    }


def create_checkout_intent(*, tenant, client, source, gateway, amount, currency, snapshot, created_by=None, payment_link=False):
    return CheckoutIntent.objects.create(
        tenant=tenant,
        client=client,
        source=source,
        gateway=gateway,
        amount=Decimal(amount).quantize(Decimal("0.01")),
        currency=currency,
        order_snapshot=snapshot,
        created_by=created_by,
        payment_link_token=uuid.uuid4() if payment_link else None,
    )


@transaction.atomic
def finalize_checkout_intent(intent, normalized_event):
    intent = CheckoutIntent.objects.select_for_update().select_related("client", "order").get(pk=intent.pk)
    if intent.order_id and intent.status == CheckoutIntent.StatusChoices.PAID:
        return intent.order

    snapshot = intent.order_snapshot or {}
    items_snapshot = snapshot.get("items", [])
    product_ids = [item["product_id"] for item in items_snapshot]
    product_map = {
        str(plan.id): plan
        for plan in PackagePlan.objects.filter(id__in=product_ids, tenant=intent.tenant)
    }

    items_data = []
    for item in items_snapshot:
        product = product_map.get(item["product_id"])
        if product is None:
            raise ValueError(f"Product {item['product_id']} is no longer available for this tenant.")
        items_data.append(
            {
                "product": product,
                "quantity": item["quantity"],
                "unit_price": Decimal(item["unit_price"]),
                "total_price": Decimal(item["total_price"]),
            }
        )

    coupon = None
    coupon_id = snapshot.get("coupon_id")
    if coupon_id:
        coupon = Coupon.objects.filter(id=coupon_id, tenant=intent.tenant).first()

    order_data = {
        "tenant": intent.tenant,
        "client": intent.client,
        "status": Order.StatusChoices.PENDING,
        "payment_method": "payment_link" if intent.source == CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK else "card",
        "subtotal": Decimal(snapshot["subtotal"]),
        "discount_amount": Decimal(snapshot["discount_amount"]),
        "tax_amount": Decimal(snapshot["tax_amount"]),
        "total_amount": Decimal(snapshot["total_amount"]),
        "coupon": coupon,
        "notes": snapshot.get("notes") or "",
        "created_by": intent.created_by,
    }
    order = OrderService.create_order_with_items(order_data, items_data)
    OrderService.mark_as_paid(order)

    payment, _ = Payment.objects.get_or_create(
        tenant=intent.tenant,
        gateway_payment_id=normalized_event["provider_payment_id"],
        defaults={
            "order": order,
            "client": intent.client,
            "gateway": intent.gateway,
            "gateway_order_id": intent.provider_order_id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": Payment.StatusChoices.SUCCESS,
            "paid_at": timezone.now(),
            "gateway_response": normalized_event["raw_payload"],
        },
    )
    if payment.order_id != order.id:
        payment.order = order
        payment.client = intent.client
        payment.gateway_order_id = intent.provider_order_id
        payment.amount = intent.amount
        payment.currency = intent.currency
        payment.status = Payment.StatusChoices.SUCCESS
        payment.paid_at = payment.paid_at or timezone.now()
        payment.gateway_response = normalized_event["raw_payload"]
        payment.save()

    if coupon and Decimal(snapshot["discount_amount"]) > 0:
        CouponService.apply(coupon, intent.client.user, order, Decimal(snapshot["discount_amount"]))

    invoice = InvoiceService.generate_from_order(order)
    try:
        InvoiceService.generate_invoice_pdf(invoice)
    except Exception:
        pass
    InvoiceService.mark_as_paid(invoice)

    intent.order = order
    intent.status = CheckoutIntent.StatusChoices.PAID
    intent.gateway_payment_id = normalized_event["provider_payment_id"]
    intent.gateway_response = normalized_event["raw_payload"]
    intent.paid_at = timezone.now()
    intent.save(update_fields=["order", "status", "gateway_payment_id", "gateway_response", "paid_at", "updated_at"])
    return order
