import uuid
from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel


# WorkoutPlan
# WorkoutDay
# Exercise
# WorkoutExercise (sets, reps, rest, etc.)

class WorkoutPlan(TenantAwareModel):
    """
    A reusable plan template (workout or diet).
    Created by staff, assigned to clients via PlanAssignment.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class PlanType(models.TextChoices):
        WORKOUT = 'workout', 'Workout'
        DIET = 'diet', 'Diet'
        HYBRID = 'hybrid', 'Hybrid (Workout + Diet)'

    class DifficultyLevel(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'

    title = models.CharField(max_length=255)
    plan_type = models.CharField(max_length=20, choices=PlanType.choices)
    difficulty = models.CharField(
        max_length=20, choices=DifficultyLevel.choices,
        default=DifficultyLevel.BEGINNER
    )
    description = models.TextField(null=True, blank=True)
    goal = models.CharField(max_length=100, null=True,
                            blank=True)  # e.g. 'Fat Loss'
    duration_weeks = models.PositiveIntegerField(default=12)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='plans_created'
    )
    # is_template = models.BooleanField(default=True)  # False = assigned copy
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'
        indexes = [
            models.Index(fields=['tenant', 'plan_type', 'is_active']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_plan_type_display()})"


class WorkoutPlanAssignment(TenantAwareModel):
    """
    Assigns a Plan to a specific Client with date range and progress.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        PAUSED = 'paused', 'Paused'
        CANCELLED = 'cancelled', 'Cancelled'

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='workout_plan_assignments'
    )
    plan = models.ForeignKey(
        WorkoutPlan, on_delete=models.PROTECT, related_name='workout_plan_assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workout_plan_assigned_by'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )
    # progress_percent = models.PositiveSmallIntegerField(default=0)  # 0–100
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Workout Plan Assignment'
        verbose_name_plural = 'Workout Plan Assignments'
        indexes = [
            models.Index(fields=['tenant', 'client', 'status']),
        ]

    def __str__(self):
        return f"{self.plan.title} → {self.client} ({self.status})"


class WorkoutDay(TenantAwareModel):
    plan_assignment = models.ForeignKey(
        WorkoutPlanAssignment,
        on_delete=models.CASCADE,
        related_name='days'
    )
    name = models.CharField(max_length=100)  # e.g. Push Day, Day 1
    day_number = models.PositiveSmallIntegerField()  # order
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['day_number']
        unique_together = ('plan_assignment', 'day_number')

    def __str__(self):
        return f"{self.plan_assignment.plan.title} - {self.name}"


class Exercise(TenantAwareModel):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    muscle_group = models.CharField(max_length=100)
    equipment = models.CharField(max_length=100, blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['tenant', 'muscle_group']),
        ]

    def __str__(self):
        return self.name


class MuscleGroup(models.Model):
    name = models.CharField(max_length=100)
    is_primary = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ExerciseMuscle(models.Model):
    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, related_name='muscles')
    muscle = models.ForeignKey(MuscleGroup, on_delete=models.CASCADE)

    is_primary = models.BooleanField(default=True)


class ExerciseMedia(models.Model):
    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, related_name='media')
    youtube_url = models.URLField(blank=True, null=True)


class WorkoutExercise(models.Model):
    workout_day = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    weight = models.FloatField(null=True, blank=True)  # weight in kg
    sets = models.IntegerField()
    reps = models.CharField(max_length=50)  # e.g. "8-12"
    rest = models.IntegerField(help_text='rest in minutes')
    notes = models.TextField(blank=True, null=True)

    class ExerciseType(models.IntegerChoices):
        BODY_WEIGHT = 1, 'Body Weight'
        PIN_LOADED = 2, 'Pin Loaded Machine'
        FREE_WEIGHT = 3, 'Free Weight'
    exercise_type = models.IntegerField(
        choices=ExerciseType.choices,
        default=ExerciseType.FREE_WEIGHT
    )
