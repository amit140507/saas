from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel


class CheckIn(TenantAwareModel):
    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='checkins'
    )
    start_date = models.DateField()
    # duration_weeks = models.IntegerField(default=12)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Check-in for {self.client.name} starting {self.start_date}"


class CheckinLog(TenantAwareModel):
    class Rating(models.IntegerChoices):
        VERY_LOW = 1, "Very Low"
        LOW = 2, "Low"
        MEDIUM = 3, "Medium"
        HIGH = 4, "High"
        VERY_HIGH = 5, "Very High"
    plan = models.ForeignKey(
        CheckIn, on_delete=models.CASCADE, related_name='daily_logs')
    week_number = models.IntegerField()
    # 0=Sunday, 1=Monday, ..., 6=Saturday
    # day_of_week = models.IntegerField() # week starts with monday
    date = models.DateField()

    # Table 1: General
    # weight = models.FloatField(null=True, blank=True)

    # Table 2: Nutrition
    fluid_intake = models.FloatField(help_text="In Litres")
    hunger_level = models.PositiveSmallIntegerField(
        choices=Rating.choices
    )
    craving_level = models.PositiveSmallIntegerField(
        choices=Rating.choices
    )
    off_plan_meal = models.BooleanField(default=False)
    off_plan_meal_details = models.TextField(
        blank=True,
        null=True,
        help_text="Describe the off-plan meal if applicable"
    )

    # Table 3: Training & Cardio
    steps = models.IntegerField(help_text="In Steps")
    cardio = models.BooleanField(default=False)
    cardio_duration = models.IntegerField(help_text="In Minutes")
    strength_training = models.BooleanField(default=False)
    strength_training_details = models.TextField(
        blank=True,
        null=True,
        help_text="Describe the strength training if applicable"
    )
    motivation = models.PositiveSmallIntegerField(
        choices=Rating.choices
    )
    performance = models.PositiveSmallIntegerField(
        choices=Rating.choices
    )

    # Table 4: Recovery & Stress
    muscle_soreness = models.PositiveSmallIntegerField(
        choices=Rating.choices,
        null=True,
        blank=True
    )

    energy_levels = models.PositiveSmallIntegerField(
        choices=Rating.choices,
        null=True,
        blank=True
    )

    stress_levels = models.PositiveSmallIntegerField(
        choices=Rating.choices,
        null=True,
        blank=True
    )

    # Table 5: Digestion
    stool_frequency = models.IntegerField(null=True, blank=True)
    STOOL_QUALITY_CHOICES = [
        ('loose', 'Loose'),
        ('regular', 'Regular'),
        ('hard', 'Hard'),
    ]
    stool_quality = models.CharField(
        max_length=10,
        choices=STOOL_QUALITY_CHOICES,
    )
    gi_distress = models.CharField(
        max_length=100, blank=True, null=True, help_text="BLOATING, CONSTIPATION, DIARRHEA, ETC")

    # Table 6: Sleep
    sleep_duration = models.FloatField(
        null=True, blank=True, help_text="Hours")
    sleep_quality = models.PositiveSmallIntegerField(
        choices=Rating.choices,
        null=True,
        blank=True
    )

    # Table 7: Notes
    notes = models.TextField(
        blank=True, null=True, help_text="MENTION ANY ACCOMPLISHMENT YOU'RE PROUD AND/OR HURDLES YOU MIGHT HAVE FACED TODAY & WOULD LIKE TO SHARE")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['plan', 'date'],
                name='unique_daily_log_per_plan_per_date'
            )
        ]
        indexes = [
            models.Index(fields=['plan', 'date']),
        ]
        ordering = ['date']

    def __str__(self):
        return f"{self.plan.client.name} - {self.date}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if not self.off_plan_meal and self.off_plan_meal_details:
            raise ValidationError(
                "Off-plan details provided but flag is false")

        if self.cardio is False and self.cardio_duration:
            raise ValidationError(
                "Cardio duration provided but cardio is false")

        if self.strength_training is False and self.strength_training_details:
            raise ValidationError(
                "Strength details provided but flag is false")
