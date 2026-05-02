from django.contrib import admin
from .models import CheckIn

@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('client', 'start_date', 'duration_weeks', 'created_at')
    list_filter = ('start_date', 'duration_weeks')
    search_fields = ('client__name', 'client__phone', 'client__email')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'checkin_time'
    ordering = ('-checkin_time',)
