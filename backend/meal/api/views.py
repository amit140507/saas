from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from ..models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem
from ..models.tracking import Meal, MealItem, DietLog, MealAdherenceLog
from .serializers import (
    FoodItemSerializer, DietPlanSerializer, DietPlanAssignmentSerializer,
    PlannedMealSerializer, PlannedMealItemSerializer,
    MealSerializer, MealItemSerializer, DietLogSerializer,
    SharedDietPlanAssignmentSerializer, MealAdherenceLogSerializer,
    MealAdherenceLogUpsertSerializer,
)
from ..services.pdf_service import create_diet_plan_pdf, send_diet_plan_email
from ..services.tracking_service import (
    calculate_adherence,
    get_active_assignment,
    get_current_client_for_user,
    get_planned_meals_for_date,
    get_plan_day_number,
    get_visible_client_or_raise,
    parse_tracking_date,
    parse_week,
    upsert_meal_adherence_log,
)
from core.tenants.permissions import IsTenantMember


class TenantScopedViewSet(viewsets.ModelViewSet):
    """Base ViewSet to ensure all queries are scoped by tenant."""
    def get_queryset(self):
        return self.model.objects.filter(tenant=self.request.tenant)


class FoodItemViewSet(viewsets.ModelViewSet):
    """Food items are global (not tenant scoped in the model)."""
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    search_fields = ['name', 'brand']


class DietPlanViewSet(TenantScopedViewSet):
    model = DietPlan
    serializer_class = DietPlanSerializer

    def get_queryset(self):
        return DietPlan.objects.filter(tenant=self.request.tenant).prefetch_related(
            'meals__items__food_item',
            'meals__supplements',
        )


class DietPlanAssignmentViewSet(TenantScopedViewSet):
    model = DietPlanAssignment
    serializer_class = DietPlanAssignmentSerializer

    def get_queryset(self):
        return DietPlanAssignment.objects.filter(tenant=self.request.tenant).select_related(
            'client__org_client__user',
            'plan',
        )


class PlannedMealViewSet(TenantScopedViewSet):
    model = PlannedMeal
    serializer_class = PlannedMealSerializer


class MealViewSet(TenantScopedViewSet):
    model = Meal
    serializer_class = MealSerializer


class DietLogViewSet(TenantScopedViewSet):
    model = DietLog
    serializer_class = DietLogSerializer


class ClientCurrentDietPlanView(APIView):
    permission_classes = [IsTenantMember]

    def get_client(self, request, client_id):
        if client_id is None:
            return get_current_client_for_user(request.user, request.tenant)
        return get_visible_client_or_raise(request.user, request.tenant, client_id)

    def get(self, request, client_id=None):
        target_date = parse_tracking_date(request.query_params.get('date'))
        client = self.get_client(request, client_id)
        assignment = get_active_assignment(client, target_date)

        if assignment is None:
            return Response({
                'client': str(client.id),
                'date': target_date.isoformat(),
                'assignment': None,
                'day_number': None,
                'meals': [],
                'logs': [],
                'adherence': calculate_adherence(0, []),
            })

        planned_meals = list(get_planned_meals_for_date(assignment, target_date))
        logs = list(
            MealAdherenceLog.objects
            .filter(
                tenant=request.tenant,
                client=client,
                log_date=target_date,
                planned_meal__in=planned_meals,
            )
            .select_related('planned_meal', 'plan_assignment')
        )

        return Response({
            'client': str(client.id),
            'date': target_date.isoformat(),
            'assignment': DietPlanAssignmentSerializer(assignment).data,
            'day_number': get_plan_day_number(assignment, target_date),
            'meals': PlannedMealSerializer(planned_meals, many=True).data,
            'logs': MealAdherenceLogSerializer(logs, many=True).data,
            'adherence': calculate_adherence(len(planned_meals), logs),
        })


class ClientMealAdherenceLogView(APIView):
    permission_classes = [IsTenantMember]

    def get(self, request, client_id):
        target_date = parse_tracking_date(request.query_params.get('date'))
        client = get_visible_client_or_raise(request.user, request.tenant, client_id)
        logs = (
            MealAdherenceLog.objects
            .filter(tenant=request.tenant, client=client, log_date=target_date)
            .select_related('planned_meal', 'plan_assignment')
            .order_by('planned_meal__day_number', 'planned_meal__meal_slot')
        )
        return Response(MealAdherenceLogSerializer(logs, many=True).data)

    def post(self, request, client_id):
        client = get_visible_client_or_raise(request.user, request.tenant, client_id)
        serializer = MealAdherenceLogUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_date = serializer.validated_data.get('log_date') or parse_tracking_date(
            request.data.get('date')
        )

        log = upsert_meal_adherence_log(
            client=client,
            planned_meal_id=serializer.validated_data['planned_meal'].id,
            log_date=target_date,
            status=serializer.validated_data['status'],
            notes=serializer.validated_data.get('notes') or '',
        )
        return Response(MealAdherenceLogSerializer(log).data, status=status.HTTP_200_OK)


class ClientMealAdherenceSummaryView(APIView):
    permission_classes = [IsTenantMember]

    def get(self, request, client_id):
        client = get_visible_client_or_raise(request.user, request.tenant, client_id)
        start_date, end_date = parse_week(request.query_params.get('week'))
        days = []
        total_planned = 0
        total_logs = []

        current = start_date
        while current <= end_date:
            assignment = get_active_assignment(client, current)
            planned_meals = list(get_planned_meals_for_date(assignment, current)) if assignment else []
            logs = list(
                MealAdherenceLog.objects
                .filter(
                    tenant=request.tenant,
                    client=client,
                    log_date=current,
                    planned_meal__in=planned_meals,
                )
            )
            day_adherence = calculate_adherence(len(planned_meals), logs)
            days.append({
                'date': current.isoformat(),
                'planned_count': day_adherence['planned_count'],
                'tracked_count': day_adherence['tracked_count'],
                'completed_count': day_adherence['completed_count'],
                'modified_count': day_adherence['modified_count'],
                'skipped_count': day_adherence['skipped_count'],
                'strict_adherence_percent': day_adherence['strict_adherence_percent'],
                'flexible_adherence_percent': day_adherence['flexible_adherence_percent'],
            })
            total_planned += len(planned_meals)
            total_logs.extend(logs)
            current += timedelta(days=1)

        return Response({
            'client': str(client.id),
            'week_start': start_date.isoformat(),
            'week_end': end_date.isoformat(),
            'summary': calculate_adherence(total_planned, total_logs),
            'days': days,
        })


class GenerateDietPlanPDFView(APIView):
    """
    View to generate and optionally email a diet plan PDF.
    """
    def post(self, request):
        try:
            data = request.data
            pdf_bytes = create_diet_plan_pdf(data, tenant=request.tenant)
            
            email = data.get('clientEmail') or data.get('client_email')
            if email:
                send_diet_plan_email(email, pdf_bytes)
                
            return Response(
                {"message": "Diet Plan PDF generated and sent successfully."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DownloadDietPlanPDFView(APIView):
    """
    View to generate and download a diet plan PDF for admin users.
    """
    def post(self, request):
        try:
            pdf_bytes = create_diet_plan_pdf(request.data, tenant=request.tenant)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="diet_plan.pdf"'
            return response
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SharedDietPlanAssignmentView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        assignment = DietPlanAssignment.objects.select_related(
            'client__org_client__user',
            'plan',
        ).prefetch_related(
            'plan__meals__items__food_item',
            'plan__meals__supplements',
        ).filter(share_token=token).first()

        if assignment is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SharedDietPlanAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)
