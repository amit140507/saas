from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FoodItemViewSet, DietPlanViewSet, DietPlanAssignmentViewSet,
    PlannedMealViewSet, MealViewSet, DietLogViewSet,
    GenerateDietPlanPDFView, DownloadDietPlanPDFView, SharedDietPlanAssignmentView,
    ClientCurrentDietPlanView, ClientMealAdherenceLogView,
    ClientMealAdherenceSummaryView,
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
    path('my-plan/current/', ClientCurrentDietPlanView.as_view(), name='my-current-diet-plan'),
    path('clients/<uuid:client_id>/plans/current/', ClientCurrentDietPlanView.as_view(), name='client-current-diet-plan'),
    path('clients/<uuid:client_id>/meal-logs/', ClientMealAdherenceLogView.as_view(), name='client-meal-adherence-logs'),
    path('clients/<uuid:client_id>/meal-logs/adherence/', ClientMealAdherenceSummaryView.as_view(), name='client-meal-adherence-summary'),
    path('', include(router.urls)),
    path('generate-pdf/', GenerateDietPlanPDFView.as_view(), name='generate-pdf'),
    path('download-pdf/', DownloadDietPlanPDFView.as_view(), name='download-pdf'),
]
