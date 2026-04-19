import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class Measurement(TenantAwareModel):
    """Timestamped body measurements for a client."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='measurements'
    )
    # user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='measurements')
    measured_at = models.DateField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_measurements'
    )

    # Body metrics (all in cm unless noted)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_fat_percent = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    bmi = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    chest = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    waist = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hips = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    biceps = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    thighs = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    calf = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    shoulder = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    neck = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    photo = models.ImageField(upload_to='measurements/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Measurement'
        verbose_name_plural = 'Measurements'
        ordering = ['-measured_at', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'measured_at']),
        ]

    def __str__(self):
        return f"{self.client} — {self.measured_at}"
