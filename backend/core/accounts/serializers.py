from rest_framework import serializers
from core.accounts.models import User
from core.tenants.models import OrganizationMember
from core.tenants.permission_codes import Perms


class MembershipSerializer(serializers.Serializer):
    """Read-only summary of one org membership, returned inline on the User."""
    tenant_id = serializers.UUIDField(source='tenant.id')
    tenant_name = serializers.CharField(source='tenant.name')
    role = serializers.CharField(source='role.name', default=None)
    is_owner = serializers.BooleanField()


class UserSerializer(serializers.ModelSerializer):
    """
    Represents the global User object.
    Profile-level fields (phone, dob, etc.) live on Client/StaffProfile — not here.
    """
    phone = serializers.SerializerMethodField()
    memberships = MembershipSerializer(
        source='org_memberships',
        many=True,
        read_only=True,
    )
    permission_codes = serializers.SerializerMethodField()

    def get_phone(self, obj):
        memberships = (
            obj.org_memberships
            .select_related('staff_profile', 'client_profile')
            .all()
        )
        for membership in memberships:
            staff_profile = getattr(membership, 'staff_profile', None)
            if staff_profile and staff_profile.phone:
                return staff_profile.phone

            client_profile = getattr(membership, 'client_profile', None)
            if client_profile and client_profile.phone:
                return client_profile.phone

        return None

    def get_permission_codes(self, obj):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None

        memberships = (
            obj.org_memberships
            .filter(status=OrganizationMember.StatusChoices.ACTIVE)
            .select_related('tenant', 'role')
            .prefetch_related('role__permissions')
        )
        membership = memberships.filter(tenant=tenant).first() if tenant else memberships.first()

        if not membership or not membership.role:
            return []
        if membership.is_owner:
            return Perms.all_perms()
        return list(membership.role.permissions.values_list('code', flat=True))

    class Meta:
        model = User
        fields = (
            'username', 'email', 'first_name', 'last_name',
            'public_id', 'is_active', 'phone', 'memberships',
            'permission_codes',
        )
        read_only_fields = ('public_id', 'phone', 'memberships', 'permission_codes')
