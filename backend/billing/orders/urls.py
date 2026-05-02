from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentLinkCheckoutView

router = DefaultRouter()
router.register(r'order', OrderViewSet, basename='order')

urlpatterns = [
    path('pay/<uuid:token>/', PaymentLinkCheckoutView.as_view(), name='payment-link-checkout'),
    path('', include(router.urls)),
]
