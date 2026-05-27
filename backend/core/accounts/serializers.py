from rest_framework import serializers
from core.accounts.models import User


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

    class Meta:
        model = User
        fields = (
            'pk', 'username', 'email', 'first_name', 'last_name',
            'public_id', 'is_active', 'phone', 'memberships',
        )
        read_only_fields = ('public_id', 'phone', 'memberships')
