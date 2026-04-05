from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckInPlanViewSet, DailyLogViewSet

router = DefaultRouter()
router.register(r'plans', CheckInPlanViewSet, basename='checkin-plan')
router.register(r'logs', DailyLogViewSet, basename='checkin-log')

urlpatterns = [
    path('', include(router.urls)),
]
