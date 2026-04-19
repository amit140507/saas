import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from core.models import TenantAwareModel
from users.models import BaseProfile

class Client(TenantAwareModel, BaseProfile):
    # Rule Followed: Use UUIDs
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_profile')
    assigned_trainer = models.ForeignKey(
        'users.StaffProfile', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_clients'
    )
    
    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        LEAD = 'lead', 'Lead'

    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.LEAD)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    
    class GoalChoices(models.TextChoices):
        FAT_LOSS = 'fat_loss', 'Fat Loss'
        MUSCLE_GAIN = 'muscle_gain', 'Muscle Gain'
        MAINTENANCE = 'maintenance', 'Maintenance'

    # Standard common fields
    goal = models.CharField(max_length=20, choices=GoalChoices.choices, null=True, blank=True)
    
    # Rule Followed: JSON for extensible schema (e.g., dynamic health form responses per tenant)
    health_and_fitness_data = models.JSONField(default=dict, blank=True, help_text="Store complex health conditions, injuries, and custom form data here")

    class Meta:
        indexes = [
            models.Index(fields=['assigned_trainer']),
            models.Index(fields=['status']),
            models.Index(fields=['tenant', 'status']),
        ]

    def clean(self):
        super().clean()
        if self.user_id and self.tenant_id:
            if getattr(self.user, 'tenant_id', None) != self.tenant_id:
                raise ValidationError({"user": "Client user must belong to the same tenant."})
                
        if self.assigned_trainer_id and self.tenant_id:
            if getattr(self.assigned_trainer, 'tenant_id', None) != self.tenant_id:
                raise ValidationError({"assigned_trainer": "Assigned trainer must belong to the same tenant."})

    def save(self, *args, **kwargs):
        # We handle activating the status automatically
        if self.pk is not None:
             orig = Client.objects.get(pk=self.pk)
             if orig.status != self.StatusChoices.ACTIVE and self.status == self.StatusChoices.ACTIVE:
                 from django.utils import timezone
                 if not self.activated_at:
                     self.activated_at = timezone.now()
                     
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Client: {self.user.get_full_name() or self.user.username}"
