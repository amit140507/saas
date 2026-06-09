from django.urls import path

from .views import (
    AdminPaymentLinkView,
    CheckoutIntentCreateView,
    CheckoutIntentDetailView,
    PaymentLinkCheckoutView,
    PaymentLinkSummaryView,
    RazorpayWebhookView,
)


urlpatterns = [
    path("checkout-intents/", CheckoutIntentCreateView.as_view(), name="payment-checkout-intents"),
    path("checkout-intents/<uuid:intent_id>/", CheckoutIntentDetailView.as_view(), name="payment-checkout-intent-detail"),
    path("admin-payment-links/", AdminPaymentLinkView.as_view(), name="payment-admin-links"),
    path("payment-links/<uuid:token>/", PaymentLinkSummaryView.as_view(), name="payment-link-summary"),
    path("payment-links/<uuid:token>/checkout/", PaymentLinkCheckoutView.as_view(), name="payment-link-checkout"),
    path("webhooks/razorpay/", RazorpayWebhookView.as_view(), name="payment-razorpay-webhook"),
]
