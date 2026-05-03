import uuid
from django.db import models
from core.tenants.models import TenantAwareModel
from core.staff.models import StaffProfile


class FoodItem(models.Model):
    """
    Global food database entry (calories, macros per 100g).
    Can be sourced from USDA / Nutritionix or manually added.
    Not tenant-scoped — shared across all tenants.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    brand = models.CharField(max_length=100, null=True, blank=True)
    calories_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fat_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)

    # Flexible nutritional data (micronutrients, vitamins, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Food Item'
        verbose_name_plural = 'Food Items'
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.calories_per_100g} kcal/100g)"


class MealSlot(models.TextChoices):
    BREAKFAST = 'breakfast', 'Breakfast'
    MORNING_SNACK = 'morning_snack', 'Morning Snack'
    LUNCH = 'lunch', 'Lunch'
    EVENING_SNACK = 'evening_snack', 'Evening Snack'
    DINNER = 'dinner', 'Dinner'
    PRE_WORKOUT = 'pre_workout', 'Pre Workout'
    POST_WORKOUT = 'post_workout', 'Post Workout'


class DietPlan(TenantAwareModel):
    """
    A template for a diet plan that can be assigned to multiple clients.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)

    class GoalChoices(models.TextChoices):
        FAT_LOSS = 'fat_loss', 'Fat Loss'
        MUSCLE_GAIN = 'muscle_gain', 'Muscle Gain'
        MAINTENANCE = 'maintenance', 'Maintenance'
        OTHER = 'other', 'Other'

    goal = models.CharField(
        max_length=20, choices=GoalChoices.choices, blank=True, null=True)

    # Target macros
    calories_target = models.IntegerField(null=True, blank=True)
    protein_target = models.IntegerField(null=True, blank=True)
    carbs_target = models.IntegerField(null=True, blank=True)
    fat_target = models.IntegerField(null=True, blank=True)

    created_by = models.ForeignKey(
        StaffProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_diet_plans'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Diet Plan'
        verbose_name_plural = 'Diet Plans'

    def __str__(self):
        return self.title


class DietPlanAssignment(TenantAwareModel):
    """
    Links a DietPlan template to a specific client with start/end dates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        'clients.Client', on_delete=models.CASCADE, related_name='diet_assignments')
    plan = models.ForeignKey(DietPlan, on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Custom adjustments for this specific client
    adjustments = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Diet Plan Assignment'
        verbose_name_plural = 'Diet Plan Assignments'

    def __str__(self):
        return f"{self.client} — {self.plan.title}"


class PlannedMeal(TenantAwareModel):
    """
    A specific meal within a DietPlan (e.g. Breakfast on Day 1).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        DietPlan, on_delete=models.CASCADE, related_name='meals')

    day_number = models.PositiveSmallIntegerField(default=1)
    meal_slot = models.CharField(max_length=20, choices=MealSlot.choices)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Planned Meal'
        verbose_name_plural = 'Planned Meals'
        ordering = ['day_number', 'meal_slot']
        constraints = [
            models.UniqueConstraint(
                fields=['plan', 'day_number', 'meal_slot'],
                name='unique_meal_per_slot_per_day'
            )
        ]

    def __str__(self):
        return f"{self.plan.title} — Day {self.day_number} — {self.get_meal_slot_display()}"


class PlannedMealItem(TenantAwareModel):
    """
    A specific food item within a PlannedMeal with quantity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meal = models.ForeignKey(
        PlannedMeal, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT)

    quantity_g = models.DecimalField(max_digits=7, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        verbose_name = 'Planned Meal Item'
        verbose_name_plural = 'Planned Meal Items'

    def __str__(self):
        return f"{self.food_item.name} ({self.quantity_g}g)"
