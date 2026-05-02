from rest_framework import serializers
from .models import (
    Feature, 
    PackageFeature, 
    MembershipPackage, 
    Membership, 
    MembershipFreeze, 
    MembershipSnapshot, 
    MembershipChange
)

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class PackageFeatureSerializer(serializers.ModelSerializer):
    feature_details = FeatureSerializer(source='feature', read_only=True)

    class Meta:
        model = PackageFeature
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class MembershipPackageSerializer(serializers.ModelSerializer):
    package_features = PackageFeatureSerializer(many=True, read_only=True)

    class Meta:
        model = MembershipPackage
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class MembershipFreezeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipFreeze
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class MembershipSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipSnapshot
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class MembershipChangeSerializer(serializers.ModelSerializer):
    from_package_details = MembershipPackageSerializer(source='from_package', read_only=True)
    to_package_details = MembershipPackageSerializer(source='to_package', read_only=True)

    class Meta:
        model = MembershipChange
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at')


class MembershipSerializer(serializers.ModelSerializer):
    package_details = MembershipPackageSerializer(source='package', read_only=True)
    freezes = MembershipFreezeSerializer(many=True, read_only=True)
    snapshot = MembershipSnapshotSerializer(read_only=True)
    changes = MembershipChangeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Membership
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'created_at', 'updated_at', 'deleted_at', 'status', 'renewed_from', 'extended_end_date', 'base_end_date')


class MembershipFreezeActionSerializer(serializers.Serializer):
    freeze_start = serializers.DateField(required=True)
    freeze_end = serializers.DateField(required=True)


class MembershipRenewActionSerializer(serializers.Serializer):
    package_id = serializers.UUIDField(required=True)
    start_date = serializers.DateField(required=False)


class MembershipChangeActionSerializer(serializers.Serializer):
    new_package_id = serializers.UUIDField(required=True)
