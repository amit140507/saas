from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'status', 'assigned_trainer')
    list_filter = ('status', 'tenant')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'goal')
