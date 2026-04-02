from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'role')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'role')}),
    )
    list_display = UserAdmin.list_display + ('tenant', 'role')
    list_filter = UserAdmin.list_filter + ('tenant', 'role')
