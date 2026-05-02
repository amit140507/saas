from rest_framework import serializers
from .models import Product, PackagePlan

class PackagePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePlan
        fields = ('id', 'name', 'price', 'billing_cycle', 'duration_in_days', 'is_active')

class PackageSerializer(serializers.ModelSerializer):
    plans = PackagePlanSerializer(many=True, read_only=True)

    class Meta:
        model = Package
        fields = ('id', 'name', 'description', 'is_active', 'plans', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

    def create(self, validated_data):
        user = self.context['request'].user
        tenant = user.tenant
        return Package.objects.create(tenant=tenant, **validated_data)
