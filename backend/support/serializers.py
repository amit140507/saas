from rest_framework import serializers
from .models import SupportTicket

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['id', 'topic', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        # For simplicity, assign the first tenant associated with the user or a default
        # Assuming TenantAwareModel logic handles tenant assignment or we do it here
        # Let's check how other models handle this.
        # usually in this project, tenant is required.
        tenant = user.tenant if hasattr(user, 'tenant') else None
        if not tenant:
            # Fallback for debugging or if not properly set
            from core.models import Tenant
            tenant = Tenant.objects.first()
            
        return SupportTicket.objects.create(user=user, tenant=tenant, **validated_data)
