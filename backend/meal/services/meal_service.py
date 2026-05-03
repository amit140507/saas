from decimal import Decimal
from django.db import transaction
from ..models.tracking import Meal, DietLog


def calculate_meal_totals(meal: Meal):
    """
    Calculates and updates total macros for a specific meal based on its items.
    """
    items = meal.items.all()
    meal.total_calories = sum(item.calories for item in items)
    meal.total_protein_g = sum(item.protein_g for item in items)
    meal.total_carbs_g = sum(item.carbs_g for item in items)
    meal.total_fat_g = sum(item.fat_g for item in items)
    meal.save()
    
    # After updating meal, update the daily log
    update_diet_log(meal.client, meal.log_date, meal.tenant)


def update_diet_log(client, log_date, tenant):
    """
    Aggregates all meals for a client on a specific day into a DietLog.
    """
    meals = Meal.objects.filter(client=client, log_date=log_date, tenant=tenant)
    
    diet_log, created = DietLog.objects.get_or_create(
        client=client,
        log_date=log_date,
        tenant=tenant
    )
    
    diet_log.total_calories = sum(meal.total_calories for meal in meals)
    diet_log.total_protein_g = sum(meal.total_protein_g for meal in meals)
    diet_log.total_carbs_g = sum(meal.total_carbs_g for meal in meals)
    diet_log.total_fat_g = sum(meal.total_fat_g for meal in meals)
    # total_fiber_g would come from items if tracked there, for now resetting or keeping
    
    diet_log.save()
