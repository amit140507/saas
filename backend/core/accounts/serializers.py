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
    memberships = MembershipSerializer(
        source='org_memberships',
        many=True,
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            'pk', 'username', 'email', 'first_name', 'last_name',
            'public_id', 'is_active', 'memberships',
        )
        read_only_fields = ('public_id', 'memberships')
