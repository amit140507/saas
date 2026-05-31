import re

from django.db import transaction
from rest_framework import serializers
from billing.subscriptions.models import Feature
from .models import Package, PackageFeature, PackagePlan
from .services import resolve_package_tenant, sync_package_relations


class FeatureCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ('id', 'name', 'code', 'description')
        read_only_fields = ('id',)


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
        fields = ('id', 'package', 'name', 'price', 'duration_in_days', 'is_active')
        read_only_fields = ('package',)


class PackageFeatureInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=50)
    description = serializers.CharField(required=False, allow_blank=True)


class PackagePlanInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    duration_in_days = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    is_active = serializers.BooleanField(required=False, default=True)


def normalize_feature_code(value):
    return re.sub(r'[^a-z0-9]+', '_', value.strip().lower()).strip('_')


class PackageSerializer(serializers.ModelSerializer):
    plans = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

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

    def get_plans(self, obj):
        return PackagePlanSerializer(obj.plans.all(), many=True).data

    def get_features(self, obj):
        return PackageFeatureSerializer(obj.package_features.all(), many=True).data

    def to_internal_value(self, data):
        internal_data = super().to_internal_value(data)

        if 'features' in data:
            features_serializer = PackageFeatureInputSerializer(data=data.get('features'), many=True)
            features_serializer.is_valid(raise_exception=True)
            internal_data['features_data'] = features_serializer.validated_data

        if 'plans' in data:
            plans_serializer = PackagePlanInputSerializer(data=data.get('plans'), many=True)
            plans_serializer.is_valid(raise_exception=True)
            internal_data['plans_data'] = plans_serializer.validated_data

        return internal_data

    def validate(self, attrs):
        features = attrs.get('features_data')
        plans = attrs.get('plans_data')

        if self.instance is None and plans is None:
            raise serializers.ValidationError({'plans': 'At least one plan is required.'})

        if plans is not None and not plans:
            raise serializers.ValidationError({'plans': 'At least one plan is required.'})

        if features is not None:
            feature_codes = [normalize_feature_code(feature['code']) for feature in features]
            if any(not code for code in feature_codes):
                raise serializers.ValidationError({'features': 'Feature code is required.'})
            if len(feature_codes) != len(set(feature_codes)):
                raise serializers.ValidationError({'features': 'Feature codes must be unique.'})

            for feature, code in zip(features, feature_codes):
                feature['code'] = code
                feature['name'] = feature['name'].strip()
                feature['description'] = feature.get('description', '').strip()

        if plans is not None:
            plan_names = [plan['name'].strip() for plan in plans]
            if any(not name for name in plan_names):
                raise serializers.ValidationError({'plans': 'Plan name is required.'})

            for plan, name in zip(plans, plan_names):
                plan['name'] = name

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        features_data = validated_data.pop('features_data', [])
        plans_data = validated_data.pop('plans_data', [])
        tenant = resolve_package_tenant(self.context['request'])
        package = Package.objects.create(tenant=tenant, **validated_data)
        return sync_package_relations(
            package=package,
            tenant=tenant,
            features=features_data,
            plans=plans_data,
        )

    @transaction.atomic
    def update(self, instance, validated_data):
        features_data = validated_data.pop('features_data', None)
        plans_data = validated_data.pop('plans_data', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if features_data is not None or plans_data is not None:
            sync_package_relations(
                package=instance,
                tenant=instance.tenant,
                features=features_data if features_data is not None else [
                    {
                        'name': package_feature.feature.name,
                        'code': package_feature.feature.code,
                        'description': package_feature.feature.description,
                    }
                    for package_feature in instance.package_features.select_related('feature')
                ],
                plans=plans_data if plans_data is not None else [
                    {
                        'name': plan.name,
                        'price': plan.price,
                        'duration_in_days': plan.duration_in_days,
                        'is_active': plan.is_active,
                    }
                    for plan in instance.plans.all()
                ],
            )

        return instance
