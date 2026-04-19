from django.contrib import admin
from .models import FoodItem, Meal, MealItem, DietLog


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'calories_per_100g', 'protein_g', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('name', 'brand')


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('client', 'log_date', 'meal_slot', 'total_calories')
    list_filter = ('meal_slot',)


@admin.register(MealItem)
class MealItemAdmin(admin.ModelAdmin):
    list_display = ('meal', 'food_item', 'quantity_g', 'calories')


@admin.register(DietLog)
class DietLogAdmin(admin.ModelAdmin):
    list_display = ('client', 'log_date', 'total_calories', 'total_protein_g', 'water_ml')
