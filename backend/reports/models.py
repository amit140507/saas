from django.db import models
from django.conf import settings
from core.models import TenantAwareModel

class BloodReport(TenantAwareModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blood_reports')
    date = models.DateField()
    lab_name = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    report_file = models.FileField(upload_to='blood_reports/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Blood Report for {self.user.username} on {self.date}"

class BloodMarkerReading(TenantAwareModel):
    report = models.ForeignKey(BloodReport, on_delete=models.CASCADE, related_name='readings')
    marker_name = models.CharField(max_length=100) # e.g., HbA1c, Cholesterol
    marker_type = models.CharField(max_length=50, blank=True, null=True) # key for easier filtering/charting
    value = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20, blank=True, null=True) # e.g., mg/dL, %
    reference_range = models.CharField(max_length=100, blank=True, null=True) # e.g., 70-100
    is_normal = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.marker_name}: {self.value} {self.unit or ''}"
