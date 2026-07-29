from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Avg
from django.db.models.functions import TruncWeek
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import FormParser, MultiPartParser

from .models import MeasurementPhoto, WeeklyMeasurement
from .serializers import WeeklyMeasurementSerializer


class WeeklyMeasurementViewSet(viewsets.ModelViewSet):
    serializer_class = WeeklyMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return WeeklyMeasurement.objects.none()

        qs = (
            WeeklyMeasurement.objects
            .filter(tenant=tenant)
            .select_related('client', 'client__org_client__user', 'client__assigned_trainer')
            .prefetch_related('photos')
        )

        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)

        if getattr(self.request.user, 'is_superuser', False):
            return qs

        member = getattr(self.request, 'tenant_member', None)
        if member is None:
            from core.tenants.rbac_service import get_member
            member = get_member(self.request.user, tenant)

        if member and member.is_owner:
            return qs

        try:
            staff = self.request.user.org_memberships.get(tenant=tenant).staff_profile
        except (ObjectDoesNotExist, AttributeError):
            return WeeklyMeasurement.objects.none()

        return qs.filter(client__assigned_trainer=staff)

    def perform_create(self, serializer):
        with transaction.atomic():
            measurement = serializer.save(tenant=getattr(self.request, 'tenant', None))
            photos = self.request.FILES.getlist('photos')

            if len(photos) > 4:
                raise ValueError("Maximum 4 photos allowed")

            MeasurementPhoto.objects.bulk_create([
                MeasurementPhoto(
                    measurement=measurement,
                    image=photo,
                    tenant=measurement.tenant,
                )
                for photo in photos
            ])

    @action(detail=False, methods=['get'])
    def weekly_stats(self, request):
        stats = (
            self.get_queryset()
            .annotate(week=TruncWeek('measured_at'))
            .values('week')
            .annotate(
                avg_weight=Avg('weight'),
                avg_chest=Avg('chest'),
                avg_abdomen=Avg('abdomen'),
                avg_glutes=Avg('glutes'),
                avg_arm_left=Avg('arm_left'),
                avg_arm_right=Avg('arm_right'),
                avg_thighs_left=Avg('thighs_left'),
                avg_thighs_right=Avg('thighs_right'),
                avg_calf_left=Avg('calf_left'),
                avg_calf_right=Avg('calf_right'),
            )
            .order_by('week')
        )
        return Response(stats)
