import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class Plan(TenantAwareModel):
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
    goal = models.CharField(max_length=100, null=True, blank=True)  # e.g. 'Fat Loss'
    duration_weeks = models.PositiveIntegerField(default=4)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='plans_created'
    )
    is_template = models.BooleanField(default=True)  # False = assigned copy
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


class PlanAssignment(TenantAwareModel):
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
        'clients.Client', on_delete=models.CASCADE, related_name='plan_assignments'
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name='assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='plan_assignments_given'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )
    progress_percent = models.PositiveSmallIntegerField(default=0)  # 0–100
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plan Assignment'
        verbose_name_plural = 'Plan Assignments'
        indexes = [
            models.Index(fields=['tenant', 'client', 'status']),
        ]

    def __str__(self):
        return f"{self.plan.title} → {self.client} ({self.status})"
