from django.contrib import admin
from .models import Package, PackageFeature, PackagePlan


class PackageFeatureInline(admin.TabularInline):
    model = PackageFeature
    extra = 1


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_freezes', 'is_active', 'tenant')
    list_filter = ('is_active', 'tenant')
    search_fields = ('name',)
    inlines = [PackageFeatureInline]


@admin.register(PackagePlan)
class PackagePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'package', 'price', 'billing_cycle', 'duration_in_days', 'tenant', 'is_active')
    list_filter = ('billing_cycle', 'is_active', 'tenant')
    search_fields = ('name', 'package__name')
