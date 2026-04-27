from django.urls import path
from .views import CreateCheckoutSessionView, UniversalWebhookView

urlpatterns = [
    path('checkout/', CreateCheckoutSessionView.as_view(), name='checkout'),
    path('webhook/', UniversalWebhookView.as_view(), name='webhook'),
]
