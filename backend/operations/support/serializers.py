from rest_framework import serializers
from .models import SupportTicket
from core.tenants.request_context import get_request_tenant

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['id', 'ticket_number', 'category', 'priority', 'subject', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'ticket_number', 'status', 'created_at']

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        tenant = get_request_tenant(request)
        if not tenant:
            raise serializers.ValidationError({'tenant': 'Tenant context is required.'})

        return SupportTicket.objects.create(raised_by=user, tenant=tenant, **validated_data)
