from django.contrib import admin
from .models import Order
from billing.invoices.models import Invoice

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id','order_number','client', 'order_type', 'product', 'total', 'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('order_number','client__name', 'order_type__name', 'product__name', 'product__description', 'product__created_at', 'product__updated_at')
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
