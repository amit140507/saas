"""
Orders serializers.
TODO: Rebuild these serializers based on the new Order/OrderItem schema.
The old serializers referenced models that have been replaced (Invoice, ProductPlan).
"""
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'order', 'product_id', 'product_type', 'quantity', 'unit_price', 'total_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id','client', 'tenant', 'order_number','status',
            'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
            'coupon', 'notes', 'payment_link_token', 'payment_method',
            'created_by', 'created_at', 'updated_at',
            'items',
        ]
        read_only_fields = ['id', 'order_number', 'payment_link_token', 'created_at', 'updated_at']
