from rest_framework import serializers
from .models import Product, ProductPlan

class ProductPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPlan
        fields = ('id', 'name', 'price', 'billing_cycle', 'duration_in_days', 'is_active')

class ProductSerializer(serializers.ModelSerializer):
    plans = ProductPlanSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'description', 'is_active', 'plans', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

    def create(self, validated_data):
        user = self.context['request'].user
        tenant = user.tenant
        return Product.objects.create(tenant=tenant, **validated_data)
