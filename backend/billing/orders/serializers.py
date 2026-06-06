from rest_framework import serializers
from .models import Order, OrderItem
from .services import OrderService


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'id','client', 'tenant', 'order_number','status',
            'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
            'coupon', 'notes', 'payment_link_token', 'payment_method',
            'created_by', 'created_at', 'updated_at',
            'items',
        ]
        read_only_fields = [
            'id', 'tenant', 'order_number', 'payment_link_token',
            'created_by', 'created_at', 'updated_at',
        ]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('At least one order item is required.')
        return items

    def validate(self, attrs):
        tenant = attrs.get('tenant') or getattr(self.instance, 'tenant', None)
        request = self.context.get('request')
        if tenant is None and request is not None:
            tenant = getattr(request, 'tenant', None)

        items = attrs.get('items')
        if tenant is not None and items is not None:
            invalid_products = [
                str(item['product'].id)
                for item in items
                if item.get('product') and item['product'].tenant_id != tenant.id
            ]
            if invalid_products:
                raise serializers.ValidationError({
                    'items': 'All order item products must belong to the current tenant.'
                })

        coupon = attrs.get('coupon')
        if tenant is not None and coupon is not None and coupon.tenant_id != tenant.id:
            raise serializers.ValidationError({
                'coupon': 'Coupon must belong to the current tenant.'
            })

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        return OrderService.create_order_with_items(validated_data, items_data)

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        return OrderService.update_order_with_items(instance, validated_data, items_data)
