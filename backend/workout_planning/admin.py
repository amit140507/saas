from django.contrib import admin
from .models import Plan, PlanAssignment

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'plan_type', 'difficulty', 'duration_weeks', 'is_active', 'tenant')
    list_filter = ('plan_type', 'difficulty', 'is_active')
    search_fields = ('title', 'goal')


@admin.register(PlanAssignment)
class PlanAssignmentAdmin(admin.ModelAdmin):
    list_display = ('plan', 'client', 'status', 'start_date', 'end_date', 'progress_percent')
    list_filter = ('status',)
