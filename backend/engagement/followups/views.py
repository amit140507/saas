from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing.subscriptions.models import Membership
from core.clients.models import ClientProfile
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant
from .models import Followup
from .serializers import FollowupSerializer, serialize_client_target


class FollowupViewSet(viewsets.ModelViewSet):
    serializer_class = FollowupSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]
    filterset_fields = ['status', 'followup_type', 'priority', 'client', 'assigned_to']

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        queryset = (
            Followup.objects
            .filter(tenant=tenant)
            .select_related('client__org_client__user', 'assigned_to', 'created_by', 'next_followup')
            .order_by('scheduled_at', '-created_at')
        )

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            tenant=require_request_tenant(self.request),
            created_by=self.request.user,
        )

    @action(detail=False, methods=['get'], url_path='suggested-targets')
    def suggested_targets(self, request):
        tenant = require_request_tenant(request)
        today = timezone.localdate()
        end_date = today + timedelta(days=7)

        targets = []
        lead_clients = (
            ClientProfile.objects
            .filter(tenant=tenant, status=ClientProfile.StatusChoices.LEAD)
            .select_related('org_client__user')
            .order_by('joined_at')[:50]
        )
        targets.extend(serialize_client_target(client, 'lead') for client in lead_clients)

        expiring_memberships = (
            Membership.objects
            .filter(
                tenant=tenant,
                status=Membership.StatusChoices.ACTIVE,
                extended_end_date__gte=today,
                extended_end_date__lte=end_date,
            )
            .select_related('client__org_client__user', 'plan__package')
            .order_by('extended_end_date')[:50]
        )

        for membership in expiring_memberships:
            client = membership.client
            user = client.user
            targets.append({
                'client': client.id,
                'client_name': user.get_full_name() or user.email or user.username,
                'client_email': user.email or '',
                'client_phone': client.phone or '',
                'reason': 'expiring_soon',
                'membership': membership.id,
                'package_name': membership.plan.package.name,
                'plan_name': membership.plan.name,
                'end_date': membership.extended_end_date,
            })

        return Response(targets)
