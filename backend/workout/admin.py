from django.contrib import admin

from .models.planning import (
    Exercise,
    ExerciseMedia,
    ExerciseMuscle,
    Muscle,
    MuscleGroup,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlan,
    WorkoutPlanAssignment,
)


# Planning tables
@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'duration_weeks', 'is_active', 'tenant')
    list_filter = ('difficulty', 'is_active')
    search_fields = ('title', 'goal')


@admin.register(WorkoutPlanAssignment)
class WorkoutPlanAssignmentAdmin(admin.ModelAdmin):
    list_display = ('plan', 'client', 'status', 'start_date', 'end_date')
    list_filter = ('status',)


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'plan_assignment', 'day_number')
    list_filter = ('day_number',)
    search_fields = ('name', 'plan__title', 'plan_assignment__plan__title')


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'primary_muscle', 'training_location', 'workout_type', 'exercise_type', 'reps', 'rest', 'equipment_required', 'is_active')
    list_filter = ('training_location', 'workout_type', 'exercise_type', 'reps', 'rest', 'equipment_required', 'is_active')
    search_fields = ('name', 'primary_muscle__name')


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Muscle)
class MuscleAdmin(admin.ModelAdmin):
    list_display = ('name', 'muscle_group')
    list_filter = ('muscle_group',)
    search_fields = ('name', 'muscle_group__name')


@admin.register(ExerciseMuscle)
class ExerciseMuscleAdmin(admin.ModelAdmin):
    list_display = ('exercise', 'sequence', 'muscle', 'is_primary')
    list_filter = ('exercise', 'muscle', 'is_primary')


@admin.register(ExerciseMedia)
class ExerciseMediaAdmin(admin.ModelAdmin):
    list_display = ('exercise', 'youtube_url')
    list_filter = ('exercise',)


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ('workout_day', 'sequence', 'body_part', 'exercise', 'sets', 'reps', 'rest')
    list_filter = ('workout_day',)
    search_fields = ('workout_day__name', 'exercise__name')
