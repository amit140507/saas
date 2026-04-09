from django.contrib import admin
from .models import Invoice, Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'total', 'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('payment_link_token',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'tenant',
        'invoice_number',
        'status',
        'generated_at',
        'pdf_url',
    )
    list_filter = ('status', 'tenant')
    search_fields = ('invoice_number', 'order__id', 'storage_key')
    raw_id_fields = ('order', 'tenant')
    readonly_fields = ('created_at', 'updated_at')
