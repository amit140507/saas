from rest_framework import serializers

from core.clients.models import ClientProfile
from core.tenants.request_context import require_request_tenant
from .models import Followup


class FollowupSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.EmailField(source='client.user.email', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Followup
        fields = (
            'id',
            'tenant',
            'client',
            'client_name',
            'client_email',
            'client_phone',
            'assigned_to',
            'assigned_to_name',
            'followup_type',
            'status',
            'priority',
            'scheduled_at',
            'completed_at',
            'notes',
            'outcome',
            'next_followup',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'tenant',
            'created_by',
            'created_at',
            'updated_at',
            'client_name',
            'client_email',
            'client_phone',
            'assigned_to_name',
        )

    def get_client_name(self, obj):
        user = obj.client.user
        return user.get_full_name() or user.email or user.username

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return ''
        return obj.assigned_to.get_full_name() or obj.assigned_to.email or obj.assigned_to.username

    def validate(self, attrs):
        tenant = require_request_tenant(self.context['request'])
        client = attrs.get('client') or getattr(self.instance, 'client', None)
        assigned_to = attrs.get('assigned_to') or getattr(self.instance, 'assigned_to', None)
        next_followup = attrs.get('next_followup') or getattr(self.instance, 'next_followup', None)

        if client is not None and client.tenant_id != tenant.id:
            raise serializers.ValidationError({'client': 'Client must belong to the current tenant.'})

        if assigned_to is not None:
            is_member = assigned_to.org_memberships.filter(tenant=tenant, status='active').exists()
            if not is_member:
                raise serializers.ValidationError({'assigned_to': 'Assigned user must belong to the current tenant.'})

        if next_followup is not None and next_followup.tenant_id != tenant.id:
            raise serializers.ValidationError({'next_followup': 'Next follow-up must belong to the current tenant.'})

        return attrs


class FollowupSuggestedTargetSerializer(serializers.Serializer):
    client = serializers.UUIDField()
    client_name = serializers.CharField()
    client_email = serializers.EmailField(allow_blank=True)
    client_phone = serializers.CharField(allow_blank=True, allow_null=True)
    reason = serializers.ChoiceField(choices=('lead', 'expiring_soon'))
    membership = serializers.UUIDField(required=False, allow_null=True)
    package_name = serializers.CharField(required=False, allow_blank=True)
    plan_name = serializers.CharField(required=False, allow_blank=True)
    end_date = serializers.DateField(required=False, allow_null=True)


def serialize_client_target(client: ClientProfile, reason: str):
    user = client.user
    return {
        'client': client.id,
        'client_name': user.get_full_name() or user.email or user.username,
        'client_email': user.email or '',
        'client_phone': client.phone or '',
        'reason': reason,
        'membership': None,
        'package_name': '',
        'plan_name': '',
        'end_date': None,
    }
