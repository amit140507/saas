from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem
from ..models.tracking import Meal, MealItem, DietLog
from .serializers import (
    FoodItemSerializer, DietPlanSerializer, DietPlanAssignmentSerializer,
    PlannedMealSerializer, PlannedMealItemSerializer,
    MealSerializer, MealItemSerializer, DietLogSerializer
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


class DietPlanAssignmentViewSet(TenantScopedViewSet):
    model = DietPlanAssignment
    serializer_class = DietPlanAssignmentSerializer


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
            pdf_bytes = create_diet_plan_pdf(data)
            
            email = data.get('client_email')
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
