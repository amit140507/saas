from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'user', 'product', 'coupon', 'subtotal', 'discount', 'total', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'created_at', 'total', 'discount', 'subtotal']
        
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
