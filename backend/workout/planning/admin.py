from django.contrib import admin
from .models import WorkoutPlan, WorkoutPlanAssignment

@admin.register(WorkoutPlan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'plan_type', 'difficulty', 'duration_weeks', 'is_active', 'tenant')
    list_filter = ('plan_type', 'difficulty', 'is_active')
    search_fields = ('title', 'goal')


@admin.register(WorkoutPlanAssignment)
class PlanAssignmentAdmin(admin.ModelAdmin):
    list_display = ('plan', 'client', 'status', 'start_date', 'end_date')
    list_filter = ('status',)
