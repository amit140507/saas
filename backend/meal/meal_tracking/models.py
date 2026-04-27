import uuid
from django.db import models
from core.models import TenantAwareModel


class FoodItem(models.Model):
    """
    Global food database entry (calories, macros per 100g).
    Can be sourced from USDA / Nutritionix or manually added.
    Not tenant-scoped — shared across all tenants.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100, null=True, blank=True)
    calories_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fat_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Food Item'
        verbose_name_plural = 'Food Items'
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.calories_per_100g} kcal/100g)"


class Meal(TenantAwareModel):
    """
    A meal entry logged by the client for a specific date and meal slot.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class MealSlot(models.TextChoices):
        BREAKFAST = 'breakfast', 'Breakfast'
        MORNING_SNACK = 'morning_snack', 'Morning Snack'
        LUNCH = 'lunch', 'Lunch'
        EVENING_SNACK = 'evening_snack', 'Evening Snack'
        DINNER = 'dinner', 'Dinner'
        POST_WORKOUT = 'post_workout', 'Post Workout'

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='meals'
    )
    log_date = models.DateField()
    meal_slot = models.CharField(max_length=20, choices=MealSlot.choices)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Computed totals cached for fast reads
    total_calories = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_protein_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_carbs_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_fat_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Meal'
        verbose_name_plural = 'Meals'
        indexes = [
            models.Index(fields=['tenant', 'client', 'log_date']),
        ]

    def __str__(self):
        return f"{self.client} — {self.meal_slot} on {self.log_date}"


class MealItem(models.Model):
    """Line item in a Meal — one food item with quantity."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(
        FoodItem, on_delete=models.PROTECT, related_name='meal_items'
    )
    quantity_g = models.DecimalField(max_digits=7, decimal_places=2)  # grams consumed
    calories = models.DecimalField(max_digits=8, decimal_places=2)    # computed
    protein_g = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=2)
    fat_g = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.food_item.name} — {self.quantity_g}g"


class DietLog(TenantAwareModel):
    """
    Daily nutrition summary for a client.
    Aggregated from Meals; used for charts and progress tracking.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='diet_logs'
    )
    log_date = models.DateField()
    total_calories = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_protein_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_carbs_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_fat_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_fiber_g = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    water_ml = models.PositiveIntegerField(default=0)
    notes = models.TextField(null=True, blank=True)
    plan_assignment = models.ForeignKey(
        'plans.PlanAssignment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='diet_logs'
    )

    class Meta:
        unique_together = ('client', 'log_date')
        verbose_name = 'Diet Log'
        verbose_name_plural = 'Diet Logs'
        indexes = [
            models.Index(fields=['tenant', 'client', 'log_date']),
        ]

    def __str__(self):
        return f"Diet Log — {self.client} on {self.log_date}"
