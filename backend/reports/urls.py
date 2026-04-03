from django.urls import path
from .views import DashboardAnalyticsView, EmailHistoryView

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-reports'),
    path('emails/', EmailHistoryView.as_view(), name='email-history'),
]
