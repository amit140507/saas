from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FoodItemViewSet, DietPlanViewSet, DietPlanAssignmentViewSet,
    PlannedMealViewSet, MealViewSet, DietLogViewSet,
    GenerateDietPlanPDFView, DownloadDietPlanPDFView, SharedDietPlanAssignmentView
)

router = DefaultRouter()
router.register(r'food-items', FoodItemViewSet, basename='fooditem')
router.register(r'plans', DietPlanViewSet, basename='dietplan')
router.register(r'assignments', DietPlanAssignmentViewSet, basename='dietplanassignment')
router.register(r'planned-meals', PlannedMealViewSet, basename='plannedmeal')
router.register(r'meals', MealViewSet, basename='meal')
router.register(r'logs', DietLogViewSet, basename='dietlog')

urlpatterns = [
    path('shared-assignments/<uuid:token>/', SharedDietPlanAssignmentView.as_view(), name='shared-diet-assignment'),
    path('', include(router.urls)),
    path('generate-pdf/', GenerateDietPlanPDFView.as_view(), name='generate-pdf'),
    path('download-pdf/', DownloadDietPlanPDFView.as_view(), name='download-pdf'),
]
