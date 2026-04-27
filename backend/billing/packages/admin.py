from django.contrib import admin
from .models import MembershipPackage, Membership, Coupon, Payment


@admin.register(MembershipPackage)
class MembershipPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'duration_days', 'price', 'max_freezes', 'is_active', 'tenant')
    list_filter = ('tier', 'is_active')
    search_fields = ('name',)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('client', 'package', 'status', 'start_date', 'end_date', 'freeze_days_used')
    list_filter = ('status',)
    search_fields = ('client__user__username', 'client__user__email')
    date_hierarchy = 'start_date'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'valid_from', 'valid_to', 'times_used', 'max_uses', 'is_active')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'gateway', 'amount', 'currency', 'status', 'paid_at')
    list_filter = ('gateway', 'status')
    search_fields = ('gateway_payment_id', 'client__user__username')
