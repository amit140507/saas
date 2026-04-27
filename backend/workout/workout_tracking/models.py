import uuid
from django.db import models
from core.models import TenantAwareModel


class Exercise(TenantAwareModel):
    """
    Exercise library entry.
    Can be global (tenant=NULL) or tenant-specific.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class MuscleGroup(models.TextChoices):
        CHEST = 'chest', 'Chest'
        BACK = 'back', 'Back'
        LEGS = 'legs', 'Legs'
        SHOULDERS = 'shoulders', 'Shoulders'
        ARMS = 'arms', 'Arms'
        CORE = 'core', 'Core'
        CARDIO = 'cardio', 'Cardio'
        FULL_BODY = 'full_body', 'Full Body'

    name = models.CharField(max_length=150)
    muscle_group = models.CharField(max_length=20, choices=MuscleGroup.choices)
    equipment = models.CharField(max_length=100, null=True, blank=True)
    instructions = models.TextField(null=True, blank=True)
    video_url = models.URLField(null=True, blank=True)
    thumbnail = models.ImageField(upload_to='exercises/', null=True, blank=True)
    is_global = models.BooleanField(default=False)  # available to all tenants

    class Meta:
        verbose_name = 'Exercise'
        verbose_name_plural = 'Exercises'
        indexes = [
            models.Index(fields=['muscle_group']),
            models.Index(fields=['is_global']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_muscle_group_display()})"


class WorkoutSession(TenantAwareModel):
    """
    A single workout session for a client on a given day.
    Linked to a PlanAssignment for tracked sessions, or standalone.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='workout_sessions'
    )
    plan_assignment = models.ForeignKey(
        'plans.PlanAssignment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions'
    )
    session_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    trainer_notes = models.TextField(null=True, blank=True)
    client_notes = models.TextField(null=True, blank=True)
    mood_rating = models.PositiveSmallIntegerField(null=True, blank=True)    # 1–5
    energy_level = models.PositiveSmallIntegerField(null=True, blank=True)  # 1–5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Workout Session'
        verbose_name_plural = 'Workout Sessions'
        indexes = [
            models.Index(fields=['tenant', 'client', 'session_date']),
        ]

    def __str__(self):
        return f"{self.client} — {self.session_date}"


class WorkoutLog(models.Model):
    """
    Per-exercise log entry within a WorkoutSession.
    Each row = one exercise performed (set data stored as JSON).
    sets_data example: [{"set": 1, "reps": 10, "weight_kg": 50, "rest_sec": 60}, ...]
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        WorkoutSession, on_delete=models.CASCADE, related_name='logs'
    )
    exercise = models.ForeignKey(
        Exercise, on_delete=models.PROTECT, related_name='logs'
    )
    sets_data = models.JSONField(default=list)
    order_in_session = models.PositiveSmallIntegerField(default=1)
    notes = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = 'Workout Log'
        verbose_name_plural = 'Workout Logs'
        ordering = ['order_in_session']

    def __str__(self):
        return f"{self.exercise.name} in session {self.session_id}"
