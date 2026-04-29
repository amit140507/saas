from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StaffProfileViewSet

router = DefaultRouter()
router.register(r'staff', StaffProfileViewSet, basename='staff-profile')

urlpatterns = [
    path('', include(router.urls)),
]
