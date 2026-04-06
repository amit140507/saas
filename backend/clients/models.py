from django.db import models
from django.conf import settings
from core.models import TenantAwareModel
from users.models import BaseProfile

class Client(TenantAwareModel, BaseProfile):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_profile')
    assigned_trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_clients'
    )
    
    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        LEAD = 'lead', 'Lead'

    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    goal = models.CharField(max_length=50, null=True, blank=True)
    health_conditions = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Client: {self.user.get_full_name() or self.user.username}"
