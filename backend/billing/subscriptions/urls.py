from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeatureViewSet, MembershipViewSet, PlanDeliveryTaskViewSet

router = DefaultRouter()
router.register(r'features', FeatureViewSet, basename='subscription-feature')
router.register(r'memberships', MembershipViewSet, basename='membership')
router.register(r'plan-delivery-tasks', PlanDeliveryTaskViewSet, basename='plan-delivery-task')

urlpatterns = [
    path('', include(router.urls)),
]
