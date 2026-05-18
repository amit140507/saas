"""
Reports views.
TODO: Rebuild DashboardAnalyticsView using the new schema
(Membership, Payment, Notification instead of Subscription, EmailLog).
"""
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import BloodReport, BloodMarker
from .serializers import BloodReportSerializer
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant, get_request_tenant_member


class BloodReportViewSet(viewsets.ModelViewSet):
    serializer_class = BloodReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = require_request_tenant(self.request)
        member = get_request_tenant_member(self.request)
        if member is None:
            return BloodReport.objects.none()
        if self.request.user.is_superuser or hasattr(member, 'staff_profile') or member.is_owner:
            return BloodReport.objects.filter(tenant=tenant)
        if hasattr(member, 'client_profile'):
            return BloodReport.objects.filter(tenant=tenant, client=member.client_profile)
        return BloodReport.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=require_request_tenant(self.request))


class DashboardAnalyticsView(APIView):
    """
    TODO: Implement analytics using new Membership + Payment models.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"detail": "Analytics endpoint — rebuild with new schema."})
