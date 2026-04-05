from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CheckInPlan, DailyLog
from .serializers import CheckInPlanSerializer, DailyLogSerializer
from core.models import Tenant

class CheckInPlanViewSet(viewsets.ModelViewSet):
    queryset = CheckInPlan.objects.all()
    serializer_class = CheckInPlanSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # For a real implementation, ensure it belongs to the tenant and the user.
        # e.g., return qs.filter(user=self.request.user)
        return qs

class DailyLogViewSet(viewsets.ModelViewSet):
    queryset = DailyLog.objects.all()
    serializer_class = DailyLogSerializer
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
        Receives an array of DailyLogs and updates or creates them.
        """
        logs_data = request.data
        if not isinstance(logs_data, list):
            return Response({"error": "Expected a list of logs"}, status=status.HTTP_400_BAD_REQUEST)
        
        updated_logs = []
        for data in logs_data:
            log_id = data.get('id')
            if log_id:
                log = DailyLog.objects.get(id=log_id)
                serializer = self.get_serializer(log, data=data, partial=True)
            else:
                serializer = self.get_serializer(data=data)
                
            serializer.is_valid(raise_exception=True)
            serializer.save()
            updated_logs.append(serializer.data)
            
        return Response(updated_logs, status=status.HTTP_200_OK)
