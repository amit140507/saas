from django.contrib import admin
from .models import Product, Subscription, Coupon

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'billing_cycle', 'duration_in_days', 'is_active')
    list_filter = ('billing_cycle', 'is_active')
    search_fields = ('name',)

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'product__billing_cycle')
    search_fields = ('user__username', 'user__email', 'product__name')
    date_hierarchy = 'start_date'

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'valid_from', 'valid_until', 'uses_count', 'max_uses', 'is_active')
    list_filter = ('discount_type', 'is_active', 'valid_from', 'valid_until')
    search_fields = ('code',)
    filter_horizontal = ('applicable_products',)
