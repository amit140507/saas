import uuid
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone

from billing.coupons.models import Coupon
from billing.coupons.services import CouponService
from billing.invoices.models import Invoice
from billing.invoices.services import InvoiceService
from billing.orders.models import Order
from billing.orders.services import OrderService
from billing.packages.models import PackagePlan
from billing.subscriptions.services import MembershipService
from engagement.communications.models import EmailLog

from .models import CheckoutIntent, Payment


logger = logging.getLogger(__name__)


def build_payment_link_url(token):
    path = reverse("payment-link-summary", kwargs={"token": token})
    base_url = (getattr(settings, "PAYMENT_LINK_BASE_URL", "") or "").rstrip("/")
    return f"{base_url}{path}" if base_url else path


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


def build_order_items_from_snapshot(*, tenant, snapshot):
    items_snapshot = snapshot.get("items", [])
    product_ids = [item["product_id"] for item in items_snapshot]
    product_map = {
        str(plan.id): plan
        for plan in PackagePlan.objects.filter(id__in=product_ids, tenant=tenant)
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
    return items_data


def build_order_email_items(order):
    items = []
    for item in order.items.select_related("product__package"):
        product = item.product
        if product is None:
            description = "Item"
        else:
            package_name = product.package.name if product.package_id else ""
            description = " - ".join(part for part in (package_name, product.name) if part)
        items.append(
            {
                "description": description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item.total_price,
            }
        )
    return items


def send_order_success_email(order, invoice=None, payment=None):
    client_user = order.client.user
    if not client_user.email:
        logger.info("Skipping order success email because client email is empty.", extra={"order_id": str(order.id)})
        return False

    context = {
        "customer_name": client_user.get_full_name() or client_user.username,
        "order": order,
        "payment": payment,
        "invoice": invoice,
        "items": build_order_email_items(order),
        "currency": getattr(order.tenant, "currency", "") or getattr(settings, "INVOICE_CURRENCY_LABEL", "INR"),
        "invoice_url": getattr(invoice, "pdf_url", "") or "",
    }
    subject = render_to_string("payments/emails/order_success/subject.txt", context).strip()
    body = render_to_string("payments/emails/order_success/body.txt", context)
    email_log = EmailLog.objects.create(
        tenant=order.tenant,
        recipient=client_user,
        recipient_email=client_user.email,
        subject=subject,
        template_name="payments/emails/order_success",
        context_data={
            "order_id": str(order.id),
            "order_number": order.order_number,
            "amount": str(order.total_amount),
            "currency": context["currency"],
            "payment_method": order.payment_method,
            "invoice_url": context["invoice_url"],
        },
        related_object_type="billing.order",
        related_object_id=str(order.id),
        status=EmailLog.StatusChoices.PENDING,
    )
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[client_user.email],
    )
    try:
        message.send(fail_silently=False)
    except Exception as exc:
        email_log.status = EmailLog.StatusChoices.FAILED
        email_log.error_message = str(exc)
        email_log.save(update_fields=["status", "error_message"])
        raise

    email_log.status = EmailLog.StatusChoices.SENT
    email_log.sent_at = timezone.now()
    email_log.save(update_fields=["status", "sent_at"])
    return True


def queue_order_success_email(order_id, invoice_id=None, payment_id=None):
    def send_after_commit():
        try:
            order = Order.objects.select_related("tenant", "client__org_client__user").get(id=order_id)
            invoice = None
            payment = None
            if invoice_id:
                invoice = Invoice.objects.filter(id=invoice_id, order_id=order_id).first()
            if payment_id:
                payment = order.payments.filter(id=payment_id).first()
            send_order_success_email(order, invoice=invoice, payment=payment)
        except Exception:
            logger.exception(
                "Order success email failed.",
                extra={
                    "order_id": str(order_id),
                    "invoice_id": str(invoice_id) if invoice_id else "",
                    "payment_id": str(payment_id) if payment_id else "",
                },
            )

    transaction.on_commit(send_after_commit)


@transaction.atomic
def create_paid_order_from_snapshot(
    *,
    tenant,
    client,
    snapshot,
    items_data,
    payment_method,
    gateway,
    amount,
    currency,
    created_by=None,
    gateway_payment_id=None,
    gateway_order_id=None,
    gateway_response=None,
    paid_at=None,
):
    paid_at = paid_at or timezone.now()
    coupon = None
    coupon_id = snapshot.get("coupon_id")
    if coupon_id:
        coupon = Coupon.objects.filter(id=coupon_id, tenant=tenant).first()

    order_data = {
        "tenant": tenant,
        "client": client,
        "status": Order.StatusChoices.PENDING,
        "payment_method": payment_method,
        "subtotal": Decimal(snapshot["subtotal"]),
        "discount_amount": Decimal(snapshot["discount_amount"]),
        "tax_amount": Decimal(snapshot["tax_amount"]),
        "total_amount": Decimal(snapshot["total_amount"]),
        "coupon": coupon,
        "notes": snapshot.get("notes") or "",
        "created_by": created_by,
    }
    order = OrderService.create_order_with_items(order_data, items_data)
    OrderService.mark_as_paid(order)

    payment = Payment.objects.create(
        tenant=tenant,
        order=order,
        client=client,
        gateway=gateway,
        gateway_payment_id=gateway_payment_id,
        gateway_order_id=gateway_order_id,
        amount=Decimal(amount).quantize(Decimal("0.01")),
        currency=currency,
        status=Payment.StatusChoices.SUCCESS,
        paid_at=paid_at,
        gateway_response=gateway_response,
    )

    if coupon and Decimal(snapshot["discount_amount"]) > 0:
        CouponService.apply(coupon, client.user, order, Decimal(snapshot["discount_amount"]))

    invoice = InvoiceService.generate_from_order(order)
    try:
        InvoiceService.generate_invoice_pdf(invoice)
    except Exception:
        logger.exception(
            "Invoice PDF generation failed.",
            extra={
                "invoice_id": str(invoice.id),
                "order_id": str(order.id),
                "tenant_id": str(tenant.id),
            },
        )
    InvoiceService.mark_as_paid(invoice)
    MembershipService.provision_paid_order(order, paid_at=paid_at)
    queue_order_success_email(order.id, invoice_id=invoice.id, payment_id=payment.id)
    return order


@transaction.atomic
def finalize_checkout_intent(intent, normalized_event):
    intent = CheckoutIntent.objects.select_for_update().select_related("client", "order").get(pk=intent.pk)
    if intent.order_id and intent.status == CheckoutIntent.StatusChoices.PAID:
        return intent.order

    snapshot = intent.order_snapshot or {}
    order = create_paid_order_from_snapshot(
        tenant=intent.tenant,
        client=intent.client,
        snapshot=snapshot,
        items_data=build_order_items_from_snapshot(tenant=intent.tenant, snapshot=snapshot),
        payment_method="payment_link" if intent.source == CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK else "checkout",
        gateway=intent.gateway,
        gateway_payment_id=normalized_event["provider_payment_id"],
        gateway_order_id=intent.provider_order_id,
        amount=intent.amount,
        currency=intent.currency,
        created_by=intent.created_by,
        gateway_response=normalized_event["raw_payload"],
    )

    intent.order = order
    intent.status = CheckoutIntent.StatusChoices.PAID
    intent.gateway_payment_id = normalized_event["provider_payment_id"]
    intent.gateway_response = normalized_event["raw_payload"]
    intent.paid_at = timezone.now()
    intent.save(update_fields=["order", "status", "gateway_payment_id", "gateway_response", "paid_at", "updated_at"])
    return order
