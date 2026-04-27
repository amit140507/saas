from django.db import models
from django.conf import settings
from core.models import TenantAwareModel

class CheckInPlan(TenantAwareModel):
    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='checkin_plans'
    )
    # user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checkin_plans')
    start_date = models.DateField()
    duration_weeks = models.IntegerField(default=12)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Plan for {self.client.user.username} starting {self.start_date} ({self.duration_weeks} weeks)"

class DailyLog(TenantAwareModel):
    plan = models.ForeignKey(CheckInPlan, on_delete=models.CASCADE, related_name='daily_logs')
    week_number = models.IntegerField()
    # 0=Sunday, 1=Monday, ..., 6=Saturday
    day_of_week = models.IntegerField() 
    date = models.DateField()

    # Table 1: General
    weight = models.FloatField(null=True, blank=True)

    # Table 2: Nutrition
    fluid_intake = models.FloatField(null=True, blank=True, help_text="Litres")
    hunger_level = models.IntegerField(null=True, blank=True, help_text="1-5")
    craving_level = models.IntegerField(null=True, blank=True, help_text="1-5")

    # Table 3: Training & Cardio
    steps = models.IntegerField(null=True, blank=True)
    cardio_mins = models.IntegerField(null=True, blank=True)
    session_completed = models.BooleanField(default=False)
    motivation = models.IntegerField(null=True, blank=True, help_text="1-5")
    performance = models.IntegerField(null=True, blank=True, help_text="1-5")

    # Table 4: Recovery & Stress
    muscle_soreness = models.IntegerField(null=True, blank=True, help_text="1-5")
    energy_levels = models.IntegerField(null=True, blank=True, help_text="1-5")
    stress_levels = models.IntegerField(null=True, blank=True, help_text="1-5")

    # Table 5: Digestion
    stool_frequency = models.IntegerField(null=True, blank=True)
    stool_quality = models.CharField(max_length=50, blank=True, null=True)
    gi_distress = models.CharField(max_length=100, blank=True, null=True)

    # Table 6: Sleep
    sleep_duration = models.FloatField(null=True, blank=True, help_text="Hours")
    sleep_quality = models.IntegerField(null=True, blank=True, help_text="1-5")

    # Table 7: Notes
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('plan', 'week_number', 'day_of_week')
        ordering = ['week_number', 'day_of_week']

    def __str__(self):
        return f"W{self.week_number} D{self.day_of_week} ({self.date})"
