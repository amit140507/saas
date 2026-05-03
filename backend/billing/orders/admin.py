from django.contrib import admin
from .models import Order, OrderItem


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_number', 'client', 'total',
                    'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('order_number', 'client__name')
    readonly_fields = ('payment_link_token',)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product',
                    'quantity', 'unit_price', 'total_price')
    list_filter = ('order__created_at',)
    search_fields = ('order__order_number', 'product__name')
