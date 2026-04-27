from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from core.tenants.models import OrganizationMember, Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant')
    list_filter = ('tenant', 'name')
    search_fields = ('name', 'tenant__name')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Public ID', {'fields': ('public_id',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Public ID', {'fields': ('public_id',)}),
    )
    list_display = UserAdmin.list_display + ('tenants', 'public_id')
    readonly_fields = ('public_id',)
    list_filter = UserAdmin.list_filter

    @admin.display(description='Tenants')
    def tenants(self, obj):
        return ', '.join(
            obj.org_memberships.filter(status=OrganizationMember.StatusChoices.ACTIVE)
            .select_related('tenant')
            .values_list('tenant__name', flat=True)
        )