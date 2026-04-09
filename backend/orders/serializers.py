from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Invoice, Order
from billing.models import ProductPlan, Coupon

User = get_user_model()


class OrderUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for order display."""
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'public_id']


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'id',
            'pdf_url',
            'storage_key',
            'invoice_number',
            'status',
            'generated_at',
            'error_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class InvoiceGenerateSerializer(serializers.Serializer):
    force = serializers.BooleanField(default=False)


class OrderProductPlanSerializer(serializers.ModelSerializer):
    """Lightweight plan serializer for order display."""
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductPlan
        fields = ['id', 'name', 'price', 'billing_cycle', 'product_name']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for user-created orders (from shop page)."""
    user_detail = OrderUserSerializer(source='user', read_only=True)
    product_detail = OrderProductPlanSerializer(source='product', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_detail', 'product', 'product_detail',
            'coupon', 'subtotal', 'discount', 'total',
            'status', 'payment_method', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'total', 'discount', 'subtotal']

    def create(self, validated_data):
        product = validated_data.get('product')
        coupon = validated_data.get('coupon', None)

        subtotal = product.price
        discount = 0

        if coupon and coupon.is_active:
            if coupon.discount_type == 'percentage':
                discount = (subtotal * coupon.discount_value) / 100
            elif coupon.discount_type == 'fixed_amount':
                discount = coupon.discount_value

        total = subtotal - discount
        if total < 0:
            total = 0

        validated_data['subtotal'] = subtotal
        validated_data['discount'] = discount
        validated_data['total'] = total

        return super().create(validated_data)


class AdminOrderSerializer(serializers.ModelSerializer):
    """Serializer for admin-created orders. Admin must specify the user (client)."""
    user_detail = OrderUserSerializer(source='user', read_only=True)
    product_detail = OrderProductPlanSerializer(source='product', read_only=True)
    invoice = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_detail', 'product', 'product_detail',
            'coupon', 'subtotal', 'discount', 'total',
            'status', 'payment_method', 'payment_link_token',
            'notes', 'invoice', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total', 'discount', 'subtotal', 'payment_link_token']

    def get_invoice(self, obj):
        try:
            return InvoiceSerializer(obj.invoice).data
        except Invoice.DoesNotExist:
            return None

    def validate_user(self, value):
        """Ensure the selected user belongs to the same tenant as the admin."""
        request = self.context.get('request')
        if request and hasattr(request.user, 'tenant'):
            if value.tenant != request.user.tenant:
                raise serializers.ValidationError("Selected user does not belong to your organization.")
        return value

    def create(self, validated_data):
        product = validated_data.get('product')
        coupon = validated_data.get('coupon', None)

        subtotal = product.price
        discount = 0

        if coupon and coupon.is_active:
            if coupon.discount_type == 'percentage':
                discount = (subtotal * coupon.discount_value) / 100
            elif coupon.discount_type == 'fixed_amount':
                discount = coupon.discount_value

        total = subtotal - discount
        if total < 0:
            total = 0

        validated_data['subtotal'] = subtotal
        validated_data['discount'] = discount
        validated_data['total'] = total

        return super().create(validated_data)
