from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, StaffProfile, Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant')
    list_filter = ('tenant', 'name')
    search_fields = ('name', 'tenant__name')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'roles')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'roles')}),
    )
    list_display = UserAdmin.list_display + ('tenant',)
    list_filter = UserAdmin.list_filter + ('tenant',)
    filter_horizontal = ('roles',)

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'specialization', 'rating')
    list_filter = ('tenant', 'specialization')
    search_fields = ('user__username', 'user__email', 'specialization')
