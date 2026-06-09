import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.tenants.permissions import HasPermission, IsTenantMember
from core.tenants.permission_codes import Perms

from .gateway import GatewayFactory
from .models import CheckoutIntent
from .serializers import (
    AdminPaymentLinkCreateSerializer,
    CheckoutIntentSerializer,
    PaymentLinkSummarySerializer,
    UserCheckoutIntentCreateSerializer,
)
from .services import (
    build_payment_link_url,
    create_checkout_intent,
    finalize_checkout_intent,
    serialize_checkout_snapshot,
    serialize_line_item,
)

logger = logging.getLogger(__name__)


class CheckoutIntentCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTenantMember]

    def post(self, request):
        serializer = UserCheckoutIntentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        plan = serializer.validated_data["plan"]
        coupon = serializer.validated_data.get("coupon")
        subtotal = serializer.validated_data["subtotal"]
        discount_amount = serializer.validated_data["discount_amount"]
        tax_amount = serializer.validated_data["tax_amount"]
        total_amount = serializer.validated_data["total_amount"]
        notes = serializer.validated_data.get("notes", "")

        adapter = GatewayFactory.get_adapter(request.tenant)
        line_item = serialize_line_item(plan, 1, plan.price, plan.price)
        snapshot = serialize_checkout_snapshot(
            client=serializer.validated_data["client"],
            items=[line_item],
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            coupon=coupon,
            notes=notes,
        )
        intent = create_checkout_intent(
            tenant=request.tenant,
            client=serializer.validated_data["client"],
            source=CheckoutIntent.SourceChoices.USER_CHECKOUT,
            gateway=adapter.provider_name,
            amount=total_amount,
            currency=request.tenant.currency or "INR",
            snapshot=snapshot,
            created_by=request.user,
        )
        checkout_data = adapter.create_order(intent)
        intent.provider_order_id = checkout_data["provider_order_id"]
        intent.save(update_fields=["provider_order_id", "updated_at"])
        return Response(
            {
                **checkout_data,
                "status": intent.status,
                "snapshot": intent.order_snapshot,
            },
            status=status.HTTP_201_CREATED,
        )


class CheckoutIntentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get(self, request, intent_id):
        intent = get_object_or_404(
            CheckoutIntent.objects.select_related("order"),
            id=intent_id,
            tenant=request.tenant,
        )
        if intent.client.user != request.user and not request.user.is_superuser:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CheckoutIntentSerializer(intent).data)


class AdminPaymentLinkView(APIView):
    permission_classes = [IsAuthenticated, HasPermission(Perms.MANAGE_ORDERS)]

    def get(self, request):
        intents = (
            CheckoutIntent.objects
            .filter(
                tenant=request.tenant,
                source=CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK,
            )
            .select_related("client", "order")
            .order_by("-created_at")
        )
        data = []
        for intent in intents:
            snapshot = intent.order_snapshot or {}
            data.append(
                {
                    "id": str(intent.id),
                    "status": intent.status,
                    "amount": str(intent.amount),
                    "currency": intent.currency,
                    "client_id": str(intent.client_id),
                    "client_name": snapshot.get("client_name") or intent.client.user.email,
                    "client_email": snapshot.get("client_email") or intent.client.user.email,
                    "payment_url": build_payment_link_url(intent.payment_link_token),
                    "payment_link_token": str(intent.payment_link_token) if intent.payment_link_token else None,
                    "created_at": intent.created_at,
                    "paid_at": intent.paid_at,
                    "order_id": str(intent.order_id) if intent.order_id else None,
                }
            )
        return Response(data)

    def post(self, request):
        serializer = AdminPaymentLinkCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        adapter = GatewayFactory.get_adapter(request.tenant)
        items = [
            serialize_line_item(
                item["product"],
                item["quantity"],
                item["unit_price"],
                item["total_price"],
            )
            for item in serializer.validated_data["items"]
        ]
        snapshot = serialize_checkout_snapshot(
            client=serializer.validated_data["client"],
            items=items,
            subtotal=serializer.validated_data["subtotal"],
            discount_amount=serializer.validated_data["discount_amount"],
            tax_amount=serializer.validated_data["tax_amount"],
            total_amount=serializer.validated_data["total_amount"],
            coupon=serializer.validated_data.get("coupon"),
            notes=serializer.validated_data.get("notes", ""),
        )
        intent = create_checkout_intent(
            tenant=request.tenant,
            client=serializer.validated_data["client"],
            source=CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK,
            gateway=adapter.provider_name,
            amount=serializer.validated_data["total_amount"],
            currency=request.tenant.currency or "INR",
            snapshot=snapshot,
            created_by=request.user,
            payment_link=True,
        )
        return Response(
            {
                "id": str(intent.id),
                "status": intent.status,
                "payment_link_token": str(intent.payment_link_token),
                "payment_url": build_payment_link_url(intent.payment_link_token),
                "amount": str(intent.amount),
                "currency": intent.currency,
                "snapshot": intent.order_snapshot,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentLinkSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        intent = get_object_or_404(
            CheckoutIntent.objects.select_related("order"),
            payment_link_token=token,
            source=CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK,
        )
        serializer = PaymentLinkSummarySerializer(intent)
        data = serializer.data
        data["payment_url"] = build_payment_link_url(intent.payment_link_token)
        data["order_id"] = str(intent.order_id) if intent.order_id else None
        return Response(data)


class PaymentLinkCheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        intent = get_object_or_404(
            CheckoutIntent.objects,
            payment_link_token=token,
            source=CheckoutIntent.SourceChoices.ADMIN_PAYMENT_LINK,
        )
        if intent.status == CheckoutIntent.StatusChoices.PAID or intent.order_id:
            return Response(
                {"error": "This payment link has already been paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        adapter = GatewayFactory.get_adapter(intent.tenant)
        checkout_data = adapter.create_order(intent)
        intent.provider_order_id = checkout_data["provider_order_id"]
        intent.status = CheckoutIntent.StatusChoices.PROCESSING
        intent.save(update_fields=["provider_order_id", "status", "updated_at"])
        return Response(
            {
                **checkout_data,
                "status": intent.status,
                "snapshot": intent.order_snapshot,
            }
        )


class RazorpayWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            provider_order_id = (
                request.data.get("payload", {})
                .get("payment", {})
                .get("entity", {})
                .get("order_id")
            )
            if not provider_order_id:
                return Response({"error": "Missing provider order id."}, status=status.HTTP_400_BAD_REQUEST)

            intent = get_object_or_404(CheckoutIntent, provider_order_id=provider_order_id)
            adapter = GatewayFactory.get_adapter(intent.tenant)
            normalized_event = adapter.verify_webhook(request)
            success_events = {"payment.captured", "order.paid", "test.payment.success"}
            if normalized_event["event_type"] not in success_events:
                return Response({"status": "ignored"}, status=status.HTTP_200_OK)

            order = finalize_checkout_intent(intent, normalized_event)
            return Response({"status": "ok", "order_id": str(order.id)}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Failed to process Razorpay webhook")
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
