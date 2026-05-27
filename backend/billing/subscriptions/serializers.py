from rest_framework import serializers

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
            'status',
            'renewed_from',
            'extended_end_date',
            'base_end_date',
        )


class MembershipFreezeActionSerializer(serializers.Serializer):
    freeze_start = serializers.DateField(required=True)
    freeze_end = serializers.DateField(required=True)


class MembershipRenewActionSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField(required=True)
    start_date = serializers.DateField(required=False)


class MembershipChangeActionSerializer(serializers.Serializer):
    new_plan_id = serializers.UUIDField(required=True)
