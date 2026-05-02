from django.contrib import admin
from .models import Invoice

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'order', 'status', 'generated_at', 'tenant')
    list_filter = ('status', 'tenant')
    search_fields = ('invoice_number', 'order__order_number')
    readonly_fields = ('id', 'invoice_number', 'generated_at', 'pdf_url', 'storage_key')
    date_hierarchy = 'generated_at'
