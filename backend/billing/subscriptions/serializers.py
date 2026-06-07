from rest_framework import serializers
from datetime import timedelta

from billing.packages.serializers import PackageFeatureSerializer, PackagePlanSerializer
from .models import (
    Addon,
    AddonFeature,
    Feature,
    Membership,
    MembershipAddon,
    MembershipChange,
    MembershipFreeze,
    MembershipSnapshot,
    PlanDeliveryTask,
)


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class AddonFeatureSerializer(serializers.ModelSerializer):
    feature_details = FeatureSerializer(source='feature', read_only=True)

    class Meta:
        model = AddonFeature
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class AddonSerializer(serializers.ModelSerializer):
    addon_features = AddonFeatureSerializer(many=True, read_only=True)

    class Meta:
        model = Addon
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class MembershipAddonSerializer(serializers.ModelSerializer):
    addon_details = AddonSerializer(source='addon', read_only=True)

    class Meta:
        model = MembershipAddon
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class MembershipFreezeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipFreeze
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class MembershipSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipSnapshot
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class MembershipChangeSerializer(serializers.ModelSerializer):
    from_plan_details = PackagePlanSerializer(source='from_plan', read_only=True)
    to_plan_details = PackagePlanSerializer(source='to_plan', read_only=True)

    class Meta:
        model = MembershipChange
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at')


class MembershipSerializer(serializers.ModelSerializer):
    plan_details = PackagePlanSerializer(source='plan', read_only=True)
    freezes = MembershipFreezeSerializer(many=True, read_only=True)
    addons = MembershipAddonSerializer(many=True, read_only=True)
    snapshot = MembershipSnapshotSerializer(read_only=True)
    changes = MembershipChangeSerializer(many=True, read_only=True)

    class Meta:
        model = Membership
        fields = '__all__'
        read_only_fields = (
            'id',
            'tenant',
            'created_at',
            'updated_at',
            'renewed_from',
            'extended_end_date',
            'base_end_date',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request is not None else None
        tenant = tenant or getattr(self.instance, 'tenant', None)

        client = attrs.get('client')
        if tenant is not None and client is not None and client.tenant_id != tenant.id:
            raise serializers.ValidationError({'client': 'Client must belong to the current tenant.'})

        plan = attrs.get('plan')
        if tenant is not None and plan is not None and plan.tenant_id != tenant.id:
            raise serializers.ValidationError({'plan': 'Plan must belong to the current tenant.'})

        order = attrs.get('order')
        if tenant is not None and order is not None and order.tenant_id != tenant.id:
            raise serializers.ValidationError({'order': 'Order must belong to the current tenant.'})

        return attrs

    def update(self, instance, validated_data):
        plan = validated_data.get('plan', instance.plan)
        start_date = validated_data.get('start_date', instance.start_date)

        if ('plan' in validated_data or 'start_date' in validated_data) and plan.duration_in_days:
            base_end_date = start_date + timedelta(days=plan.duration_in_days)
            validated_data['base_end_date'] = base_end_date
            validated_data['extended_end_date'] = base_end_date

        return super().update(instance, validated_data)


class PlanDeliveryTaskSerializer(serializers.ModelSerializer):
    package_plan_details = PackagePlanSerializer(source='package_plan', read_only=True)

    class Meta:
        model = PlanDeliveryTask
        fields = '__all__'
        read_only_fields = (
            'id',
            'tenant',
            'client',
            'order',
            'membership',
            'package_plan',
            'due_date',
            'created_at',
            'updated_at',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request is not None else None

        assigned_to = attrs.get('assigned_to')
        if tenant is not None and assigned_to is not None:
            if not assigned_to.org_memberships.filter(tenant=tenant, status='active').exists():
                raise serializers.ValidationError({
                    'assigned_to': 'Assigned user must belong to the current tenant.'
                })

        return attrs


class MembershipFreezeActionSerializer(serializers.Serializer):
    freeze_start = serializers.DateField(required=True)
    freeze_end = serializers.DateField(required=True)


class MembershipRenewActionSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField(required=True)
    start_date = serializers.DateField(required=False)


class MembershipChangeActionSerializer(serializers.Serializer):
    new_plan_id = serializers.UUIDField(required=True)
