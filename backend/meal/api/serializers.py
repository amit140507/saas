from rest_framework import serializers
from ..models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem
from ..models.tracking import Meal, MealItem, DietLog


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = '__all__'


class PlannedMealItemSerializer(serializers.ModelSerializer):
    food_item_name = serializers.ReadOnlyField(source='food_item.name')

    class Meta:
        model = PlannedMealItem
        fields = '__all__'


class PlannedMealSerializer(serializers.ModelSerializer):
    items = PlannedMealItemSerializer(many=True, read_only=True)

    class Meta:
        model = PlannedMeal
        fields = '__all__'


class DietPlanSerializer(serializers.ModelSerializer):
    meals = PlannedMealSerializer(many=True, read_only=True)

    class Meta:
        model = DietPlan
        fields = '__all__'


class DietPlanAssignmentSerializer(serializers.ModelSerializer):
    plan_title = serializers.ReadOnlyField(source='plan.title')
    client_name = serializers.ReadOnlyField(source='client.user.get_full_name')

    class Meta:
        model = DietPlanAssignment
        fields = '__all__'


class MealItemSerializer(serializers.ModelSerializer):
    food_item_name = serializers.ReadOnlyField(source='food_item.name')

    class Meta:
        model = MealItem
        fields = '__all__'


class MealSerializer(serializers.ModelSerializer):
    items = MealItemSerializer(many=True, read_only=True)

    class Meta:
        model = Meal
        fields = '__all__'


class DietLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietLog
        fields = '__all__'
