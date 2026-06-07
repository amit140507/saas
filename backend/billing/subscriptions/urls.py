from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeatureViewSet, MembershipViewSet

router = DefaultRouter()
router.register(r'features', FeatureViewSet, basename='subscription-feature')
router.register(r'memberships', MembershipViewSet, basename='membership')

urlpatterns = [
    path('', include(router.urls)),
]
