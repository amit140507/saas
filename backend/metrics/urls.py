from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeasurementViewSet, MeasurementGoalViewSet

router = DefaultRouter()
router.register(r'measurements', MeasurementViewSet, basename='measurement')
router.register(r'goals', MeasurementGoalViewSet, basename='measurement-goal')

urlpatterns = [
    path('', include(router.urls)),
]
