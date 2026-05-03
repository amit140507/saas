from django.contrib import admin
from .models import WorkoutSession, WorkoutLog


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('client', 'session_date', 'plan_assignment')
    list_filter = ('session_date', 'tenant')


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ('session', 'exercise')
