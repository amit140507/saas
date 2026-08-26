from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from ..models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem
from ..models.tracking import Meal, MealItem, DietLog
from .serializers import (
    FoodItemSerializer, DietPlanSerializer, DietPlanAssignmentSerializer,
    PlannedMealSerializer, PlannedMealItemSerializer,
    MealSerializer, MealItemSerializer, DietLogSerializer,
    SharedDietPlanAssignmentSerializer,
)
from ..services.pdf_service import create_diet_plan_pdf, send_diet_plan_email


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
