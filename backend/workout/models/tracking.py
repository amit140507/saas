import uuid

from django.db import models

from core.tenants.models import TenantAwareModel
from workout.models.planning import (
    Exercise,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlanAssignment,
)


class WorkoutSession(TenantAwareModel):
    """
    A single workout session for a client on a given day.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        'clients.ClientProfile',
        on_delete=models.CASCADE,
        related_name='workout_sessions',
    )
    plan_assignment = models.ForeignKey(
        WorkoutPlanAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
    )
    workout_day = models.ForeignKey(
        WorkoutDay,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    session_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Workout Session'
        verbose_name_plural = 'Workout Sessions'
        indexes = [
            models.Index(fields=['tenant', 'client', 'session_date']),
        ]

    def __str__(self):
        return f"{self.client} - {self.session_date}"


class WorkoutLog(TenantAwareModel):
    """
    Per-exercise log entry within a workout session.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        WorkoutSession,
        on_delete=models.CASCADE,
        related_name='logs',
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.PROTECT,
        related_name='logs',
    )
    plan_exercise = models.ForeignKey(
        WorkoutExercise,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    planned_sets = models.IntegerField(null=True, blank=True)
    planned_reps = models.IntegerField(null=True, blank=True)
    planned_weight = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Workout Log'
        verbose_name_plural = 'Workout Logs'

    def __str__(self):
        return f"{self.exercise.name} in session {self.session_id}"


class SetLog(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workout_log = models.ForeignKey(
        WorkoutLog,
        on_delete=models.CASCADE,
        related_name='sets',
    )
    set_number = models.IntegerField()
    reps = models.IntegerField()
    weight = models.FloatField()
    rest_sec = models.IntegerField()
    is_pr = models.BooleanField(default=False)

    class Meta:
        ordering = ['set_number']

