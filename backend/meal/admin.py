from django.contrib import admin
from .models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem
from .models.tracking import Meal, MealItem, DietLog

@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'calories_per_100g', 'protein_g', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('name', 'brand')

@admin.register(DietPlan)
class DietPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'goal', 'calories_target', 'is_active')
    list_filter = ('goal', 'is_active')
    search_fields = ('title',)

@admin.register(DietPlanAssignment)
class DietPlanAssignmentAdmin(admin.ModelAdmin):
    list_display = ('client', 'plan', 'start_date', 'is_active')
    list_filter = ('is_active', 'start_date')

class PlannedMealItemInline(admin.TabularInline):
    model = PlannedMealItem
    extra = 1

@admin.register(PlannedMeal)
class PlannedMealAdmin(admin.ModelAdmin):
    list_display = ('plan', 'day_number', 'meal_slot')
    list_filter = ('day_number', 'meal_slot')
    inlines = [PlannedMealItemInline]

class MealItemInline(admin.TabularInline):
    model = MealItem
    extra = 1

@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('client', 'log_date', 'meal_slot', 'total_calories')
    list_filter = ('log_date', 'meal_slot')
    inlines = [MealItemInline]

@admin.register(DietLog)
class DietLogAdmin(admin.ModelAdmin):
    list_display = ('client', 'log_date', 'total_calories', 'water_ml')
    list_filter = ('log_date',)
