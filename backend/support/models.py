import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class SupportTicket(TenantAwareModel):
    """Support ticket raised by a client or staff."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class PriorityChoices(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    class StatusChoices(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        WAITING = 'waiting', 'Waiting on Client'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    class CategoryChoices(models.TextChoices):
        BILLING = 'billing', 'Billing'
        MEMBERSHIP = 'membership', 'Membership'
        TECHNICAL = 'technical', 'Technical'
        PLAN = 'plan', 'Plan / Training'
        GENERAL = 'general', 'General'

    ticket_number = models.CharField(max_length=20, unique=True)  # e.g. TKT-00451
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='support_tickets'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    category = models.CharField(max_length=20, choices=CategoryChoices.choices)
    priority = models.CharField(
        max_length=10, choices=PriorityChoices.choices, default=PriorityChoices.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.OPEN
    )
    subject = models.CharField(max_length=255)
    description = models.TextField()
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Support Ticket'
        verbose_name_plural = 'Support Tickets'
        indexes = [
            models.Index(fields=['tenant', 'status', 'priority']),
            models.Index(fields=['ticket_number']),
        ]

    def __str__(self):
        return f"{self.ticket_number} — {self.subject} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            import random, string
            suffix = ''.join(random.choices(string.digits, k=5))
            self.ticket_number = f"TKT-{suffix}"
        super().save(*args, **kwargs)


class TicketReply(models.Model):
    """Thread reply on a SupportTicket."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    body = models.TextField()
    is_internal = models.BooleanField(default=False)  # internal staff note
    attachment = models.FileField(upload_to='support/attachments/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ticket Reply'
        verbose_name_plural = 'Ticket Replies'
        ordering = ['created_at']

    def __str__(self):
        return f"Reply on {self.ticket.ticket_number} by {self.author}"
