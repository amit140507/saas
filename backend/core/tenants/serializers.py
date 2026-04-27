from rest_framework import serializers
from .models import Role, Permission, OrganizationMember, Tenant

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('id', 'name')
        read_only_fields = ('id',)

class TenantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('name',)

    def validate_name(self, value):
        return value.strip()

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'code', 'description']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system', 'is_default', 'permissions', 'permission_codes']
        read_only_fields = ['is_system']

    def create(self, validated_data):
        perm_codes = validated_data.pop('permission_codes', [])
        role = super().create(validated_data)
        if perm_codes:
            perms = Permission.objects.filter(code__in=perm_codes)
            role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        perm_codes = validated_data.pop('permission_codes', None)
        role = super().update(instance, validated_data)
        if perm_codes is not None:
            perms = Permission.objects.filter(code__in=perm_codes)
            role.permissions.set(perms)
        return role

class OrganizationMemberSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = OrganizationMember
        fields = ['id', 'user', 'role', 'role_id', 'status', 'is_owner', 'joined_at']
        read_only_fields = ['joined_at', 'is_owner']
