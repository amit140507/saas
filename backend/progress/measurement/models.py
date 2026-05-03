import uuid
from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel
from django.core.exceptions import ValidationError


class WeeklyMeasurement(TenantAwareModel):
    """Timestamped body measurements for a client."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='measurements'
    )
    # Body metrics (all in cm unless noted)
    abdomen = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    arm_left = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    arm_right = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    calf_left = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    calf_right = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    chest = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    glutes = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    thighs_left = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    thighs_right = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    measured_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Measurement'
        verbose_name_plural = 'Measurements'
        ordering = ['-measured_at', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'measured_at']),
        ]

    def clean(self):
        if self.pk and self.photos.count() > 4:
            raise ValidationError("Only 4 photos allowed per measurement.")

    def __str__(self):
        return f"{self.client} — {self.measured_at}"


class MeasurementPhoto(TenantAwareModel):
    measurement = models.ForeignKey(
        'WeeklyMeasurement',
        on_delete=models.CASCADE,
        related_name='photos'
    )

    class PhotoType(models.TextChoices):
        FRONT = 'front', 'Front'
        LEFT = 'left_side', 'Left Side'
        RIGHT = 'right_side', 'Right Side'
        BACK = 'back', 'Back'

    photo_type = models.CharField(
        max_length=10, choices=PhotoType.choices, default=PhotoType.FRONT)
    image = models.ImageField(upload_to='measurements/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']
        constraints = [
            models.UniqueConstraint(
                fields=['measurement', 'photo_type'],
                name='unique_measurement_photo_per_type'
            )
        ]
