from django.contrib import admin
from .models import CheckIn

@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('client', 'start_date', 'created_at')
    list_filter = ('start_date', 'tenant')
    search_fields = ('client__name', 'client__phone', 'client__user__email')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
