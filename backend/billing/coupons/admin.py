from django.contrib import admin
from .models import Coupon, CouponRule, CouponUsage

class CouponRuleInline(admin.StackedInline):
    model = CouponRule
    can_delete = False
    verbose_name_plural = 'Coupon Rules'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'category', 'discount_type', 'discount_value', 'is_active', 'times_used', 'valid_to']
    list_filter  = ['category', 'discount_type', 'is_active', 'is_auto_applied', 'user_segment']
    search_fields = ['code', 'description']
    inlines = [CouponRuleInline]


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ['coupon', 'user', 'order', 'discount_applied', 'used_at']
    readonly_fields = ['coupon', 'user', 'order', 'used_at']
