from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant')
    list_filter = ('tenant', 'name')
    search_fields = ('name', 'tenant__name')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'roles')}),
        ('Public ID', {'fields': ('public_id',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'roles')}),
        ('Public ID', {'fields': ('public_id',)}),
    )
    list_display = UserAdmin.list_display + ('tenant', 'public_id')
    readonly_fields = ('public_id',)
    list_filter = UserAdmin.list_filter + ('tenant',)
    filter_horizontal = ('roles',)