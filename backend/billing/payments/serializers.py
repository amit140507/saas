from decimal import Decimal

from rest_framework import serializers

from billing.coupons.models import Coupon
from billing.coupons.services import CouponService
from billing.packages.models import PackagePlan
from core.clients.models import ClientProfile
from core.tenants.rbac_service import get_member

from .models import CheckoutIntent


MANUAL_PAYMENT_METHOD_CHOICES = (
    ("cash", "Cash"),
    ("upi", "UPI"),
    ("card", "Card"),
    ("bank_transfer", "Bank Transfer"),
    ("pos", "POS"),
)


class CheckoutIntentItemInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=PackagePlan.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class UserCheckoutIntentCreateSerializer(serializers.Serializer):
    plan_id = serializers.PrimaryKeyRelatedField(source="plan", queryset=PackagePlan.objects.all())
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context["request"]
        tenant = getattr(request, "tenant", None)
        member = get_member(request.user, tenant) if tenant else None
        client = getattr(member, "client_profile", None)

        if tenant is None:
            raise serializers.ValidationError({"detail": "Organization context is required."})
        if client is None:
            raise serializers.ValidationError({"detail": "Only clients can start checkout."})

        plan = attrs["plan"]
        if plan.tenant_id != tenant.id or not plan.is_active or not plan.package.is_active:
            raise serializers.ValidationError({"plan_id": "Selected plan is not available for this organization."})

        subtotal = Decimal(plan.price)
        coupon = None
        discount_amount = Decimal("0.00")
        coupon_code = attrs.get("coupon_code", "").strip()
        if coupon_code:
            validation = CouponService.validate(coupon_code, tenant, request.user, subtotal)
            if not validation["valid"]:
                raise serializers.ValidationError({"coupon_code": validation["error"]})
            coupon = validation["coupon"]
            discount_amount = CouponService.calculate_discount(coupon, subtotal).quantize(Decimal("0.01"))

        attrs["client"] = client
        attrs["coupon"] = coupon
        attrs["subtotal"] = subtotal.quantize(Decimal("0.01"))
        attrs["discount_amount"] = discount_amount
        attrs["tax_amount"] = Decimal("0.00")
        attrs["total_amount"] = max(attrs["subtotal"] - discount_amount, Decimal("0.00"))
        return attrs


class AdminPaymentLinkCreateSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=ClientProfile.objects.all())
    coupon = serializers.PrimaryKeyRelatedField(queryset=Coupon.objects.all(), required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    items = CheckoutIntentItemInputSerializer(many=True)

    def validate(self, attrs):
        request = self.context["request"]
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            raise serializers.ValidationError({"detail": "Organization context is required."})

        client = attrs["client"]
        if client.tenant_id != tenant.id:
            raise serializers.ValidationError({"client": "Selected client must belong to the current organization."})

        coupon = attrs.get("coupon")
        if coupon and coupon.tenant_id != tenant.id:
            raise serializers.ValidationError({"coupon": "Coupon must belong to the current organization."})

        computed_subtotal = Decimal("0.00")
        for item in attrs["items"]:
            product = item["product"]
            if product.tenant_id != tenant.id:
                raise serializers.ValidationError({"items": "All products must belong to the current organization."})
            if not product.is_active or not product.package.is_active:
                raise serializers.ValidationError({"items": "All selected products must be active."})

            expected_total = (Decimal(item["unit_price"]) * item["quantity"]).quantize(Decimal("0.01"))
            if expected_total != Decimal(item["total_price"]).quantize(Decimal("0.01")):
                raise serializers.ValidationError({"items": "Each line total must match quantity x unit price."})
            computed_subtotal += expected_total

        normalized_subtotal = computed_subtotal.quantize(Decimal("0.01"))
        if normalized_subtotal != Decimal(attrs["subtotal"]).quantize(Decimal("0.01")):
            raise serializers.ValidationError({"subtotal": "Subtotal does not match the submitted order items."})

        expected_total_amount = (
            normalized_subtotal
            - Decimal(attrs["discount_amount"])
            + Decimal(attrs["tax_amount"])
        ).quantize(Decimal("0.01"))
        if expected_total_amount < 0:
            raise serializers.ValidationError({"total_amount": "Total amount cannot be negative."})
        if expected_total_amount != Decimal(attrs["total_amount"]).quantize(Decimal("0.01")):
            raise serializers.ValidationError({"total_amount": "Total amount must equal subtotal - discount + tax."})

        return attrs


class AdminManualPaymentCreateSerializer(AdminPaymentLinkCreateSerializer):
    payment_method = serializers.ChoiceField(
        choices=MANUAL_PAYMENT_METHOD_CHOICES,
        required=False,
        default="cash",
    )


class CheckoutIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckoutIntent
        fields = (
            "id",
            "source",
            "status",
            "gateway",
            "provider_order_id",
            "gateway_payment_id",
            "amount",
            "currency",
            "payment_link_token",
            "order_snapshot",
            "paid_at",
            "order",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class PaymentLinkSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckoutIntent
        fields = (
            "id",
            "status",
            "source",
            "amount",
            "currency",
            "payment_link_token",
            "order_snapshot",
            "paid_at",
        )
        read_only_fields = fields
