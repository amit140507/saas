import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class BloodReport(TenantAwareModel):
    """Blood test report uploaded for a client."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blood_reports')
    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='blood_reports'
    )
    report_date = models.DateField()
    lab_name = models.CharField(max_length=200, null=True, blank=True)
    report_file = models.FileField(upload_to='blood_reports/%Y/%m/')
    notes = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_reports'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Blood Report'
        verbose_name_plural = 'Blood Reports'
        ordering = ['-report_date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'client', 'report_date']),
        ]

    def __str__(self):
        return f"Blood Report — {self.client} on {self.report_date}"


class BloodMarker(models.Model):
    """
    Individual marker value within a BloodReport.
    e.g. HbA1c = 5.4, Vitamin D = 32
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        BloodReport, on_delete=models.CASCADE, related_name='markers'
    )
    marker_name = models.CharField(max_length=100)   # e.g. 'HbA1c'
    value = models.DecimalField(max_digits=8, decimal_places=3)
    unit = models.CharField(max_length=30, null=True, blank=True)  # e.g. '%', 'mg/dL'
    normal_min = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    normal_max = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    is_abnormal = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Blood Marker'
        verbose_name_plural = 'Blood Markers'

    def __str__(self):
        return f"{self.marker_name}: {self.value} {self.unit or ''}"
