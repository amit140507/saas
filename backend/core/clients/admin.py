from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('client_user', 'tenant', 'phone', 'status',
                    'assigned_trainer', 'sex', 'date_of_joining')
    list_filter = ('status', 'tenant', 'sex', 'date_of_joining')
    search_fields = (
        'org_client__user__username',
        'org_client__user__email',
        'org_client__user__first_name',
        'org_client__user__last_name',
        'goal',
    )
    fieldsets = (
        (None, {'fields': ('org_client', 'tenant', 'status', 'assigned_trainer')}),
        ('Client Profile', {'fields': ('goal',)}),
        ('Personal Info', {'fields': ('phone', 'dob', 'sex',
         'profile_picture', 'date_of_joining', 'referral_source')}),
    )

    @admin.display(description='User')
    def client_user(self, obj):
        return obj.user
