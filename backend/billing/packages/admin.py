from django.contrib import admin
from .models import Package, PackagePlan


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'tenant')
    list_filter = ('is_active', 'tenant')
    search_fields = ('name',)


@admin.register(PackagePlan)
class PackagePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'package', 'price', 'billing_cycle', 'duration_in_days', 'is_active')
    list_filter = ('billing_cycle', 'is_active', 'tenant')
    search_fields = ('name', 'package__name')
