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


class BloodReportViewSet(viewsets.ModelViewSet):
    serializer_class = BloodReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        if not tenant:
            return BloodReport.objects.none()
        if user.is_staff_member:
            return BloodReport.objects.filter(tenant=tenant)
        # Client: return their own reports via client_profile
        if hasattr(user, 'client_profile'):
            return BloodReport.objects.filter(client=user.client_profile)
        return BloodReport.objects.none()

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class DashboardAnalyticsView(APIView):
    """
    TODO: Implement analytics using new Membership + Payment models.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"detail": "Analytics endpoint — rebuild with new schema."})
