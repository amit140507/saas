from django.contrib import admin
from .models import Exercise, WorkoutSession, WorkoutLog


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'muscle_group', 'equipment', 'is_global')
    list_filter = ('muscle_group', 'is_global')
    search_fields = ('name',)


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('client', 'session_date', 'is_completed', 'mood_rating', 'energy_level')
    list_filter = ('is_completed',)


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ('session', 'exercise', 'order_in_session')
