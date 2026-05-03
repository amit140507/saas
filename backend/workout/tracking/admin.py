from django.contrib import admin
from .models import Exercise, WorkoutSession, WorkoutLog


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'muscle_group', 'equipment')
    list_filter = ('muscle_group', 'tenant')
    search_fields = ('name',)


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('client', 'session_date', 'plan_assignment')
    list_filter = ('session_date', 'tenant')


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ('session', 'exercise')
