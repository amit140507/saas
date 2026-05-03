from django.contrib import admin
from .models import WorkoutPlan, WorkoutPlanAssignment, WorkoutDay, Exercise, MuscleGroup, ExerciseMuscle, ExerciseMedia, WorkoutExercise


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'plan_type', 'difficulty',
                    'duration_weeks', 'is_active', 'tenant')
    list_filter = ('plan_type', 'difficulty', 'is_active')
    search_fields = ('title', 'goal')


@admin.register(WorkoutPlanAssignment)
class WorkoutPlanAssignmentAdmin(admin.ModelAdmin):
    list_display = ('plan', 'client', 'status', 'start_date', 'end_date')
    list_filter = ('status',)


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan_assignment', 'day_number')
    list_filter = ('day_number',)
    search_fields = ('name', 'plan_assignment__title')


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'equipment_required', 'is_active')
    list_filter = ('equipment_required', 'is_active')
    search_fields = ('name',)


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(ExerciseMuscle)
class ExerciseMuscleAdmin(admin.ModelAdmin):
    list_display = ('exercise', 'muscle', 'is_primary')
    list_filter = ('exercise', 'muscle', 'is_primary')


@admin.register(ExerciseMedia)
class ExerciseMediaAdmin(admin.ModelAdmin):
    list_display = ('exercise', 'youtube_url')
    list_filter = ('exercise', 'youtube_url')


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ('workout_day', 'exercise',
                    'sets', 'reps', 'rest')
    list_filter = ('workout_day',)
    search_fields = ('workout_day__name', 'exercise__name')
