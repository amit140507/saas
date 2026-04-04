from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg
from django.db.models.functions import TruncWeek
from .models import Measurement, MeasurementGoal
from .serializers import MeasurementSerializer, MeasurementGoalSerializer

class MeasurementViewSet(viewsets.ModelViewSet):
    serializer_class = MeasurementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Measurement.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, tenant=self.request.user.tenant)

    @action(detail=False, methods=['get'])
    def weekly_stats(self, request):
        """
        Returns average weight and other metrics grouped by week for charts.
        """
        stats = (
            self.get_queryset()
            .annotate(week=TruncWeek('date'))
            .values('week')
            .annotate(
                avg_weight=Avg('weight'),
                avg_waist=Avg('waist'),
                avg_chest=Avg('chest'),
                avg_hips=Avg('hips'),
                avg_biceps=Avg('biceps'),
                avg_thighs=Avg('thighs'),
            )
            .order_by('week')
        )
        return Response(stats)

class MeasurementGoalViewSet(viewsets.ModelViewSet):
    serializer_class = MeasurementGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MeasurementGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, tenant=self.request.user.tenant)
