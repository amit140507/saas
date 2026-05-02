from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyMeasurementViewSet

router = DefaultRouter()
router.register(r'weekly-measurements', WeeklyMeasurementViewSet, basename='weekly-measurement')

urlpatterns = [
    path('', include(router.urls)),
]
