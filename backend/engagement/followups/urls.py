from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FollowupViewSet


router = DefaultRouter()
router.register(r'followups', FollowupViewSet, basename='followup')

urlpatterns = [
    path('', include(router.urls)),
]
