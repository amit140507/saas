from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckInPlanViewSet, DailyLogViewSet

router = DefaultRouter()
router.register(r'daily-checkins', CheckInPlanViewSet, basename='daily-checkins')
router.register(r'daily-checkins-logs', DailyLogViewSet, basename='daily-checkins-logs')

urlpatterns = [
    path('', include(router.urls)),
]
