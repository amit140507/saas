from rest_framework import serializers
from .models import Coupon, CouponRule, CouponUsage

class CouponRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CouponRule
        exclude = ('coupon',) # Exclude to avoid nested creation issues for now, or include if needed


class CouponSerializer(serializers.ModelSerializer):
    rule = CouponRuleSerializer(read_only=True)
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('tenant', 'times_used')

    def get_usage_count(self, obj):
        return obj.times_used


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    order_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    package_plan_id = serializers.UUIDField(required=False, allow_null=True)


class CouponUsageSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    order_total_amount = serializers.DecimalField(source='order.total_amount', max_digits=10, decimal_places=2, read_only=True)
    order_discount_amount = serializers.DecimalField(source='order.discount_amount', max_digits=10, decimal_places=2, read_only=True)
    order_created_at = serializers.DateTimeField(source='order.created_at', read_only=True)
    
    class Meta:
        model = CouponUsage
        fields = '__all__'
