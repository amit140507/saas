from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardAnalyticsView, BloodReportViewSet

router = DefaultRouter()
router.register(r'blood-reports', BloodReportViewSet, basename='blood-report')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-reports'),
]
