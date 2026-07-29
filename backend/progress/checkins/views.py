from rest_framework import permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CheckIn, CheckinLog
from .serializers import CheckInSerializer, CheckInLogSerializer
from .services.checkin_service import CheckInService

class CheckInPlanViewSet(viewsets.ModelViewSet):
    serializer_class = CheckInSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CheckIn.objects.select_related('client', 'client__org_client__user').prefetch_related('daily_logs')
        tenant = getattr(self.request, 'tenant', None)
        client_id = self.request.query_params.get('client')

        if tenant:
            qs = qs.filter(tenant=tenant)
        if client_id:
            qs = qs.filter(client_id=client_id)

        return qs

class CheckinLogViewSet(viewsets.ModelViewSet):
    serializer_class = CheckInLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['plan', 'week_number']
    
    def get_queryset(self):
        qs = CheckinLog.objects.select_related('plan', 'plan__client', 'plan__client__org_client__user')
        tenant = getattr(self.request, 'tenant', None)
        plan_id = self.request.query_params.get('plan')
        week = self.request.query_params.get('week_number')

        if tenant:
            qs = qs.filter(tenant=tenant)
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        if week:
            qs = qs.filter(week_number=week)
        return qs

    @action(detail=False, methods=['post'])
    def bulk_update_logs(self, request):
        """
        Receives an array of DailyLogs and updates or creates them via the service layer.
        """
        try:
            updated_logs = CheckInService.bulk_update_logs(request.data)
            return Response(updated_logs, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
