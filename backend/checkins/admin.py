from django.contrib import admin
from .models import CheckInPlan

@admin.register(CheckInPlan)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('client', 'checkin_time', 'membership', 'is_valid', 'created_at')
    list_filter = ('is_valid', 'membership__package__tier', 'checkin_time')
    search_fields = ('client__name', 'client__phone', 'client__email')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'checkin_time'
    ordering = ('-checkin_time',)
