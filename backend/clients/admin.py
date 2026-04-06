from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'phone', 'status', 'assigned_trainer', 'sex', 'date_of_joining')
    list_filter = ('status', 'tenant', 'sex', 'date_of_joining')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'goal')
    fieldsets = (
        (None, {'fields': ('user', 'tenant', 'status', 'assigned_trainer')}),
        ('Client Profile', {'fields': ('goal', 'health_conditions')}),
        ('Personal Info', {'fields': ('phone', 'dob', 'sex', 'profile_picture', 'date_of_joining', 'referral_source')}),
    )
