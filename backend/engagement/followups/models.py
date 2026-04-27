import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class Followup(TenantAwareModel):
    """
    Scheduled or completed follow-up interaction with a client.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class FollowupType(models.TextChoices):
        CALL = 'call', 'Phone Call'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        EMAIL = 'email', 'Email'
        IN_PERSON = 'in_person', 'In-Person'
        SMS = 'sms', 'SMS'

    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        MISSED = 'missed', 'Missed'
        RESCHEDULED = 'rescheduled', 'Rescheduled'

    class PriorityChoices(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='followups'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_followups'
    )
    followup_type = models.CharField(max_length=20, choices=FollowupType.choices)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )
    priority = models.CharField(
        max_length=10, choices=PriorityChoices.choices, default=PriorityChoices.MEDIUM
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    outcome = models.TextField(null=True, blank=True)  # result of the follow-up
    next_followup = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rescheduled_from'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='followups_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Follow-Up'
        verbose_name_plural = 'Follow-Ups'
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['assigned_to', 'scheduled_at']),
        ]

    def __str__(self):
        return f"{self.get_followup_type_display()} — {self.scheduled_at:%Y-%m-%d}"
