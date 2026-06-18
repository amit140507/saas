from django.contrib import admin

from .models import CheckoutIntent, Payment, PaymentGatewayConfig, Transaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "order",
        "gateway",
        "amount",
        "currency",
        "status",
        "paid_at",
        "tenant",
    )
    list_filter = ("status", "gateway", "currency", "tenant", "paid_at", "created_at")
    search_fields = (
        "id",
        "client__org_client__user__email",
        "order__order_number",
        "gateway_payment_id",
        "gateway_order_id",
        "gateway_subscription_id",
    )
    readonly_fields = ("id", "created_at", "updated_at", "gateway_response")
    ordering = ("-created_at",)


@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ("tenant", "provider_name", "is_active")
    list_filter = ("provider_name", "is_active", "tenant")
    search_fields = ("tenant__name", "provider_name", "api_key")


@admin.register(CheckoutIntent)
class CheckoutIntentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "order",
        "source",
        "status",
        "gateway",
        "amount",
        "currency",
        "paid_at",
        "tenant",
    )
    list_filter = ("source", "status", "gateway", "currency", "tenant", "paid_at")
    search_fields = (
        "id",
        "client__org_client__user__email",
        "order__order_number",
        "provider_order_id",
        "gateway_payment_id",
        "payment_link_token",
    )
    readonly_fields = (
        "id",
        "payment_link_token",
        "order_snapshot",
        "gateway_response",
    )
    ordering = ("-id",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "gateway_transaction_id",
        "amount",
        "status",
        "created_at",
        "tenant",
    )
    list_filter = ("status", "tenant", "created_at")
    search_fields = ("id", "order__order_number", "gateway_transaction_id")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
