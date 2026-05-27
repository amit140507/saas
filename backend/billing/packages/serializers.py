from rest_framework import serializers
from .models import Package, PackageFeature, PackagePlan
from .services import resolve_package_tenant


class PackageFeatureSerializer(serializers.ModelSerializer):
    feature_details = serializers.SerializerMethodField()

    class Meta:
        model = PackageFeature
        fields = ('id', 'feature', 'feature_details')
        read_only_fields = ('id',)

    def get_feature_details(self, obj):
        return {
            'id': obj.feature_id,
            'name': obj.feature.name,
            'code': obj.feature.code,
            'description': obj.feature.description,
        }


class PackagePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePlan
        fields = ('id', 'package', 'name', 'price', 'billing_cycle', 'duration_in_days', 'is_active')
        read_only_fields = ('package',)

class PackageSerializer(serializers.ModelSerializer):
    plans = PackagePlanSerializer(many=True, read_only=True)
    features = PackageFeatureSerializer(source='package_features', many=True, read_only=True)

    class Meta:
        model = Package
        fields = (
            'id',
            'name',
            'description',
            'max_freezes',
            'is_active',
            'features',
            'plans',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def create(self, validated_data):
        tenant = resolve_package_tenant(self.context['request'])
        return Package.objects.create(tenant=tenant, **validated_data)
