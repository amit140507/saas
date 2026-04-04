from django.db import models
from django.conf import settings
from core.models import TenantAwareModel
from billing.models import Subscription

class FollowUp(TenantAwareModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    class Type(models.TextChoices):
        RENEWAL_7_DAY = 'renewal_7_day', '7-Day Renewal Reminder'
        RENEWAL_3_DAY = 'renewal_3_day', '3-Day Renewal Reminder'
        EXPIRY_DAY = 'expiry_day', 'Expiry Day Reminder'
        POST_EXPIRY = 'post_expiry', 'Post-Expiry Follow-Up'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followups')
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='followups')
    scheduled_date = models.DateField()
    followup_type = models.CharField(max_length=50, choices=Type.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_date']
        unique_together = ('subscription', 'followup_type')

    def __str__(self):
        return f"{self.user.username} - {self.followup_type} ({self.status})"
