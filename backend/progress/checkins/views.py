from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CheckIn, CheckinLog
from .serializers import CheckInSerializer, CheckInLogSerializer
from .services.checkin_service import CheckInService

class CheckInPlanViewSet(viewsets.ModelViewSet):
    queryset = CheckIn.objects.all()
    serializer_class = CheckInSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # For a real implementation, ensure it belongs to the tenant and the user.
        # e.g., return qs.filter(user=self.request.user)
        return qs

class CheckinLogViewSet(viewsets.ModelViewSet):
    queryset = CheckinLog.objects.all()
    serializer_class = CheckInLogSerializer
    filterset_fields = ['plan', 'week_number']
    
    def get_queryset(self):
        qs = super().get_queryset()
        plan_id = self.request.query_params.get('plan')
        week = self.request.query_params.get('week_number')
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
