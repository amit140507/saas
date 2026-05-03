from django.contrib import admin
from .models import WeeklyMeasurement


@admin.register(WeeklyMeasurement)
class WeeklyMeasurementAdmin(admin.ModelAdmin):
    list_display = ('client', 'measured_at', 'created_at')
    list_filter = ('measured_at', 'tenant')
    search_fields = ('client__name', 'client__phone', 'client__user__email')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
