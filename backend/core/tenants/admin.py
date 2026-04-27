from django.contrib import admin
from .models import Organization, Role, Permission, OrganizationMember

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'is_system', 'is_default')
    list_filter = ('tenant', 'is_system', 'is_default')
    search_fields = ('name', 'tenant__name')

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('code', 'description')
    search_fields = ('code',)

@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'role', 'status', 'is_owner')
    list_filter = ('status', 'is_owner', 'tenant', 'role')
    search_fields = ('user__username', 'user__email', 'tenant__name')
