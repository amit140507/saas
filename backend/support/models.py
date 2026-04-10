from django.db import models
from django.conf import settings
from core.models import TenantAwareModel

class SupportTicket(TenantAwareModel):
    class Topic(models.TextChoices):
        TECHNICAL = 'technical', 'Technical Issue'
        BILLING = 'billing', 'Billing & Subscription'
        DIET_PLAN = 'diet_plan', 'Diet Plan Query'
        ORDER = 'order', 'Order Status'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        CLOSED = 'closed', 'Closed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    topic = models.CharField(max_length=50, choices=Topic.choices, default=Topic.OTHER)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.topic} ({self.status})"
