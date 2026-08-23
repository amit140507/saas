from django.db import transaction
from rest_framework import serializers
from ..models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem, PlannedMealSupplement
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


class PlannedMealSupplementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannedMealSupplement
        fields = '__all__'


class PlannedMealSerializer(serializers.ModelSerializer):
    items = PlannedMealItemSerializer(many=True, read_only=True)
    supplements = PlannedMealSupplementSerializer(many=True, read_only=True)

    class Meta:
        model = PlannedMeal
        fields = '__all__'


class PlannedMealItemPayloadSerializer(serializers.Serializer):
    food_item = serializers.PrimaryKeyRelatedField(queryset=FoodItem.objects.all())
    quantity_g = serializers.DecimalField(max_digits=7, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PlannedMealSupplementPayloadSerializer(serializers.Serializer):
    supplement_id = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=7, decimal_places=2, required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_blank=True)


class PlannedMealPayloadSerializer(serializers.Serializer):
    day_number = serializers.IntegerField(min_value=1, default=1)
    meal_slot = serializers.ChoiceField(choices=PlannedMeal._meta.get_field('meal_slot').choices)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    items = PlannedMealItemPayloadSerializer(many=True, required=False)
    supplements = PlannedMealSupplementPayloadSerializer(many=True, required=False)


class DietPlanSerializer(serializers.ModelSerializer):
    meals = PlannedMealSerializer(many=True, read_only=True)
    meal_templates = PlannedMealPayloadSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = DietPlan
        fields = [
            'id',
            'tenant',
            'title',
            'goal',
            'calories_target',
            'protein_target',
            'carbs_target',
            'fat_target',
            'created_by',
            'is_active',
            'meals',
            'meal_templates',
        ]

    @transaction.atomic
    def create(self, validated_data):
        meal_templates = validated_data.pop('meal_templates', None)
        plan = super().create(validated_data)
        if meal_templates is not None:
            self._sync_meals(plan, meal_templates)
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        meal_templates = validated_data.pop('meal_templates', None)
        plan = super().update(instance, validated_data)
        if meal_templates is not None:
            self._sync_meals(plan, meal_templates)
        return plan

    def _sync_meals(self, plan, meal_templates):
        plan.meals.all().delete()
        for meal_data in meal_templates:
            items = meal_data.pop('items', [])
            supplements = meal_data.pop('supplements', [])
            meal = PlannedMeal.objects.create(
                tenant=plan.tenant,
                plan=plan,
                day_number=meal_data.get('day_number') or 1,
                meal_slot=meal_data['meal_slot'],
                notes=meal_data.get('notes') or '',
            )
            PlannedMealItem.objects.bulk_create([
                PlannedMealItem(
                    tenant=plan.tenant,
                    meal=meal,
                    food_item=item['food_item'],
                    quantity_g=item['quantity_g'],
                    notes=item.get('notes') or '',
                )
                for item in items
            ])
            PlannedMealSupplement.objects.bulk_create([
                PlannedMealSupplement(
                    tenant=plan.tenant,
                    meal=meal,
                    supplement_id=supplement.get('supplement_id') or '',
                    name=supplement['name'],
                    amount=supplement.get('amount'),
                    unit=supplement.get('unit') or '',
                )
                for supplement in supplements
            ])


class DietPlanAssignmentSerializer(serializers.ModelSerializer):
    plan_title = serializers.ReadOnlyField(source='plan.title')
    client_name = serializers.ReadOnlyField(source='client.user.get_full_name')

    class Meta:
        model = DietPlanAssignment
        fields = '__all__'


class SharedDietPlanAssignmentSerializer(serializers.ModelSerializer):
    plan_title = serializers.ReadOnlyField(source='plan.title')
    client_name = serializers.ReadOnlyField(source='client.user.get_full_name')
    meals = PlannedMealSerializer(source='plan.meals', many=True, read_only=True)
    goal = serializers.ReadOnlyField(source='plan.goal')
    calories_target = serializers.ReadOnlyField(source='plan.calories_target')
    protein_target = serializers.ReadOnlyField(source='plan.protein_target')
    carbs_target = serializers.ReadOnlyField(source='plan.carbs_target')
    fat_target = serializers.ReadOnlyField(source='plan.fat_target')

    class Meta:
        model = DietPlanAssignment
        fields = [
            'id',
            'plan_title',
            'client_name',
            'start_date',
            'end_date',
            'is_active',
            'adjustments',
            'goal',
            'calories_target',
            'protein_target',
            'carbs_target',
            'fat_target',
            'meals',
        ]


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
