import uuid

from django.conf import settings
from django.db import models

from core.tenants.models import TenantAwareModel, TimeAwareModel


class WorkoutPlan(TenantAwareModel):
    """
    A reusable workout plan template created by staff and assigned to clients.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class DifficultyLevel(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'

    title = models.CharField(max_length=255)
    difficulty = models.CharField(
        max_length=20,
        choices=DifficultyLevel.choices,
        default=DifficultyLevel.BEGINNER,
    )
    description = models.TextField(null=True, blank=True)
    goal = models.CharField(max_length=100, null=True, blank=True)
    duration_weeks = models.PositiveIntegerField(default=12)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='plans_created',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'
        indexes = [
            models.Index(fields=['tenant', 'is_active'], name='workout_plan_tenant_active_idx'),
        ]

    def __str__(self):
        return self.title


class WorkoutPlanAssignment(TenantAwareModel):
    """
    Assigns a workout plan to a specific client with date range and status.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        PAUSED = 'paused', 'Paused'
        CANCELLED = 'cancelled', 'Cancelled'

    client = models.ForeignKey(
        'clients.ClientProfile',
        on_delete=models.CASCADE,
        related_name='workout_plan_assignments',
    )
    plan = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.PROTECT,
        related_name='workout_plan_assignments',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workout_plan_assigned_by',
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
    )
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
        return f"{self.plan.title} -> {self.client} ({self.status})"


class WorkoutDay(TenantAwareModel):
    plan = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='template_days',
    )
    plan_assignment = models.ForeignKey(
        WorkoutPlanAssignment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='workout_days',
    )
    name = models.CharField(max_length=100)
    day_number = models.PositiveSmallIntegerField()
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['day_number']
        constraints = [
            models.UniqueConstraint(
                fields=['plan', 'day_number'],
                condition=models.Q(plan__isnull=False),
                name='uniq_workout_day_plan_day',
            ),
            models.UniqueConstraint(
                fields=['plan_assignment', 'day_number'],
                condition=models.Q(plan_assignment__isnull=False),
                name='uniq_workout_day_assignment_day',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(plan__isnull=False, plan_assignment__isnull=True)
                    | models.Q(plan__isnull=True, plan_assignment__isnull=False)
                ),
                name='workout_day_has_one_owner',
            ),
        ]

    def __str__(self):
        if self.plan_id:
            return f"{self.plan.title} - {self.name}"
        return f"{self.plan_assignment.plan.title} - {self.name}"


class Exercise(TimeAwareModel):
    """
    Global exercise catalog shared across all tenants.
    """

    class ExerciseType(models.IntegerChoices):
        BODY_WEIGHT = 1, 'Body Weight'
        PIN_LOADED = 2, 'Pin Loaded Machine'
        FREE_WEIGHT = 3, 'Free Weight'

    class TrainingLocation(models.TextChoices):
        GYM = 'gym', 'Gym'
        HOME = 'home', 'Home'

    class WorkoutType(models.TextChoices):
        PUSH = 'push', 'Push'
        PULL = 'pull', 'Pull'
        LEGS = 'legs', 'Legs'

    class RepsRange(models.TextChoices):
        FOUR_TO_SIX = '4-6', '4-6'
        SIX_TO_EIGHT = '6-8', '6-8'
        EIGHT_TO_TEN = '8-10', '8-10'
        TEN_TO_TWELVE = '10-12', '10-12'
        TWELVE_TO_FIFTEEN = '12-15', '12-15'
        FIFTEEN_TO_TWENTY = '15-20', '15-20'

    class RestPeriod(models.IntegerChoices):
        FIFTEEN_SECONDS = 15, '15s'
        THIRTY_SECONDS = 30, '30s'
        FORTY_FIVE_SECONDS = 45, '45s'
        SIXTY_SECONDS = 60, '60s'
        SEVENTY_FIVE_SECONDS = 75, '75s'
        NINETY_SECONDS = 90, '90s'
        ONE_HUNDRED_FIVE_SECONDS = 105, '105s'
        ONE_HUNDRED_TWENTY_SECONDS = 120, '120s'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    primary_muscle = models.ForeignKey(
        'Muscle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='primary_exercises',
    )
    training_location = models.CharField(
        max_length=10,
        choices=TrainingLocation.choices,
        null=True,
        blank=True,
    )
    workout_type = models.CharField(
        max_length=20,
        choices=WorkoutType.choices,
        null=True,
        blank=True,
    )
    exercise_type = models.IntegerField(
        choices=ExerciseType.choices,
        default=ExerciseType.FREE_WEIGHT,
    )
    reps = models.CharField(
        max_length=10,
        choices=RepsRange.choices,
        blank=True,
        default='',
    )
    rest = models.PositiveSmallIntegerField(
        choices=RestPeriod.choices,
        null=True,
        blank=True,
        help_text='rest in seconds',
    )
    equipment_required = models.BooleanField(default=False)
    instructions = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['primary_muscle', 'is_active'], name='work_exe_primary_active_idx'),
        ]

    def __str__(self):
        return self.name


class MuscleGroup(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['name'], name='unique_muscle_group_name'),
        ]

    def __str__(self):
        return self.name


class Muscle(models.Model):
    muscle_group = models.ForeignKey(
        MuscleGroup,
        on_delete=models.CASCADE,
        related_name='muscles',
    )
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ['muscle_group__name', 'name']
        constraints = [
            models.UniqueConstraint(fields=['muscle_group', 'name'], name='unique_muscle_per_group'),
        ]

    def __str__(self):
        return f"{self.muscle_group} - {self.name}"


class ExerciseMuscle(models.Model):
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name='muscles',
    )
    muscle = models.ForeignKey(Muscle, on_delete=models.CASCADE)
    sequence = models.PositiveSmallIntegerField(default=1)
    is_primary = models.BooleanField(default=True)

    class Meta:
        ordering = ['sequence', 'id']
        indexes = [
            models.Index(fields=['exercise', 'sequence'], name='exercise_muscle_sequence_idx'),
        ]


class ExerciseMedia(models.Model):
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name='media',
    )
    youtube_url = models.URLField(blank=True, null=True)


class WorkoutExercise(models.Model):
    workout_day = models.ForeignKey(
        WorkoutDay,
        on_delete=models.CASCADE,
        related_name='exercises',
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name='planned_instances',
    )
    sequence = models.PositiveSmallIntegerField(default=1)
    body_part = models.CharField(max_length=100, blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    weight = models.FloatField(null=True, blank=True)
    sets = models.IntegerField()
    reps = models.CharField(max_length=50, choices=Exercise.RepsRange.choices)
    rest = models.IntegerField(choices=Exercise.RestPeriod.choices, help_text='rest in seconds')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['sequence', 'id']
        indexes = [
            models.Index(fields=['workout_day', 'sequence'], name='workout_ex_day_sequence_idx'),
        ]
