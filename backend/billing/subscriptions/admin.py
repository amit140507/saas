from django.contrib import admin

from .models import (
    Addon,
    AddonFeature,
    Feature,
    Membership,
    MembershipAddon,
    MembershipChange,
    MembershipFreeze,
    MembershipSnapshot,
)


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'tenant')
    list_filter = ('tenant',)
    search_fields = ('name', 'code', 'description')


class AddonFeatureInline(admin.TabularInline):
    model = AddonFeature
    extra = 1


@admin.register(Addon)
class AddonAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'billing_type', 'price', 'is_active', 'tenant')
    list_filter = ('billing_type', 'is_active', 'tenant')
    search_fields = ('name', 'code', 'description')
    readonly_fields = ('id',)
    inlines = [AddonFeatureInline]


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
    readonly_fields = ('from_plan', 'to_plan', 'price_difference')


class MembershipAddonInline(admin.TabularInline):
    model = MembershipAddon
    extra = 0


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('client', 'plan', 'status', 'start_date', 'extended_end_date', 'tenant')
    list_filter = ('status', 'tenant')
    search_fields = ('client__org_client__user__email', 'plan__name', 'plan__package__name')
    # list_filter = ('status', 'tenant')
    # search_fields = ('client__user__email', 'client__user__first_name', 'client__user__last_name')
    # readonly_fields = ('id', 'base_end_date', 'extended_end_date')
    # date_hierarchy = 'start_date'
    inlines = [
        MembershipFreezeInline,
        MembershipAddonInline,
        MembershipChangeInline,
        MembershipSnapshotInline,
    ]


@admin.register(MembershipAddon)
class MembershipAddonAdmin(admin.ModelAdmin):
    list_display = ('membership', 'addon', 'price', 'start_date', 'end_date', 'status', 'tenant')
    list_filter = ('status', 'tenant')
    search_fields = ('membership__client__user__email', 'addon__name', 'addon__code')


@admin.register(MembershipFreeze)
class MembershipFreezeAdmin(admin.ModelAdmin):
    list_display = ('membership', 'start_date', 'end_date', 'days', 'tenant')
    list_filter = ('tenant',)


@admin.register(MembershipChange)
class MembershipChangeAdmin(admin.ModelAdmin):
    list_display = ('membership', 'from_plan', 'to_plan', 'price_difference', 'tenant')
    list_filter = ('tenant',)


@admin.register(MembershipSnapshot)
class MembershipSnapshotAdmin(admin.ModelAdmin):
    list_display = ('membership', 'tenant')
    list_filter = ('tenant',)
