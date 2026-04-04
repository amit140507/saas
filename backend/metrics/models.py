from django.db import models
from django.conf import settings
from core.models import TenantAwareModel

class Measurement(TenantAwareModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='measurements')
    date = models.DateField()
    
    # Measurements in CM/KG
    chest = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hips = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    biceps = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    thighs = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    waist = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    photo = models.ImageField(upload_to='measurement_photos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.date}"

class MeasurementGoal(TenantAwareModel):
    METRIC_CHOICES = [
        ('chest', 'Chest'),
        ('hips', 'Hips'),
        ('biceps', 'Biceps'),
        ('thighs', 'Thighs'),
        ('waist', 'Waist'),
        ('weight', 'Weight'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='measurement_goals')
    metric = models.CharField(max_length=20, choices=METRIC_CHOICES)
    target_value = models.DecimalField(max_digits=5, decimal_places=2)
    current_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_achieved = models.BooleanField(default=False)
    achieved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.metric} Goal: {self.target_value}"
