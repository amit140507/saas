import re

from rest_framework import serializers
from .models import Role, Permission, OrganizationMember, Tenant

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('id', 'name', 'brand_color')
        read_only_fields = ('id',)

class TenantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('name',)

    def validate_name(self, value):
        return value.strip()


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    remove_logo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Tenant
        fields = (
            'id',
            'name',
            'slug',
            'logo',
            'website',
            'gstin',
            'brand_color',
            'remove_logo',
        )
        read_only_fields = ('id',)
        extra_kwargs = {
            'logo': {'required': False, 'allow_null': True},
            'website': {'required': False, 'allow_blank': True, 'allow_null': True},
            'gstin': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Organization name cannot be blank.")
        return name

    def validate_slug(self, value):
        return value.strip()

    def validate_website(self, value):
        if value in (None, ""):
            return ""
        return value.strip()

    def validate_gstin(self, value):
        if value in (None, ""):
            return ""
        return value.strip().upper()

    def validate_brand_color(self, value):
        color = value.strip()
        if not re.fullmatch(r"#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?", color):
            raise serializers.ValidationError(
                "Enter a valid hex color in #RGB or #RRGGBB format."
            )

        hex_value = color[1:]
        if len(hex_value) == 3:
            hex_value = "".join(char * 2 for char in hex_value)
        return f"#{hex_value.upper()}"

    def update(self, instance, validated_data):
        remove_logo = validated_data.pop("remove_logo", False)
        new_logo = validated_data.get("logo")

        if remove_logo and instance.logo and not new_logo:
            instance.logo.delete(save=False)
            validated_data["logo"] = None

        return super().update(instance, validated_data)

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
