from django.contrib import admin
from .models import (
    Feature, 
    PackageFeature, 
    MembershipPackage, 
    Membership, 
    MembershipFreeze,
    MembershipSnapshot,
    MembershipChange
)

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'tenant')
    list_filter = ('tenant',)
    search_fields = ('name', 'code', 'description')


class PackageFeatureInline(admin.TabularInline):
    model = PackageFeature
    extra = 1

@admin.register(MembershipPackage)
class MembershipPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'duration_days', 'price', 'is_active', 'tenant')
    list_filter = ('tier', 'is_active', 'tenant')
    search_fields = ('name', 'description')
    readonly_fields = ('id',)
    inlines = [PackageFeatureInline]


class MembershipFreezeInline(admin.TabularInline):
    model = MembershipFreeze
    extra = 0
    readonly_fields = ('days',)

class MembershipSnapshotInline(admin.StackedInline):
    model = MembershipSnapshot
    readonly_fields = ('data',)

class MembershipChangeInline(admin.TabularInline):
    model = MembershipChange
    extra = 0
    readonly_fields = ('from_package', 'to_package', 'price_difference')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('client', 'package', 'status', 'start_date', 'extended_end_date', 'tenant')
    list_filter = ('status', 'tenant')
    search_fields = ('client__user__email', 'client__user__first_name', 'client__user__last_name')
    readonly_fields = ('id', 'base_end_date', 'extended_end_date')
    date_hierarchy = 'start_date'
    inlines = [MembershipFreezeInline, MembershipChangeInline, MembershipSnapshotInline]

@admin.register(MembershipFreeze)
class MembershipFreezeAdmin(admin.ModelAdmin):
    list_display = ('membership', 'start_date', 'end_date', 'days', 'tenant')
    list_filter = ('tenant',)

@admin.register(MembershipChange)
class MembershipChangeAdmin(admin.ModelAdmin):
    list_display = ('membership', 'from_package', 'to_package', 'price_difference', 'tenant')
    list_filter = ('tenant',)

@admin.register(MembershipSnapshot)
class MembershipSnapshotAdmin(admin.ModelAdmin):
    list_display = ('membership', 'tenant')
    list_filter = ('tenant',)
