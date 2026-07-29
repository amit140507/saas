"""
Reports views.
TODO: Rebuild DashboardAnalyticsView using the new schema
(Membership, Payment, Notification instead of Subscription, EmailLog).
"""
from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import BloodReport
from .serializers import BloodReportSerializer
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant, get_request_tenant_member


class BloodReportViewSet(viewsets.ModelViewSet):
    serializer_class = BloodReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        queryset = (
            BloodReport.objects
            .filter(tenant=tenant)
            .select_related('client', 'client__org_client', 'client__org_client__user')
            .prefetch_related('markers')
        )
        if self.request.user.is_superuser:
            return queryset

        member = get_request_tenant_member(self.request)
        if member is None:
            return BloodReport.objects.none()
        if hasattr(member, 'staff_profile') or member.is_owner:
            return queryset
        if hasattr(member, 'client_profile'):
            return queryset.filter(client=member.client_profile)
        return BloodReport.objects.none()

    def perform_create(self, serializer):
        tenant = require_request_tenant(self.request)
        member = get_request_tenant_member(self.request)
        if not serializer.validated_data.get('client'):
            client_profile = getattr(member, 'client_profile', None)
            if client_profile is None:
                raise ValidationError({'client': 'Client is required.'})
            serializer.save(tenant=tenant, client=client_profile)
            return
        serializer.save(tenant=tenant)


class DashboardAnalyticsView(APIView):
    """
    TODO: Implement analytics using new Membership + Payment models.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"detail": "Analytics endpoint — rebuild with new schema."})
