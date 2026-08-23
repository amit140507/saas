from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from meal.api.serializers import DietPlanSerializer
from meal.models import DietPlan, DietPlanAssignment, FoodItem, PlannedMealSupplement


class DietPlanBuilderPersistenceTests(TestCase):
    def setUp(self):
        self.tenant = Organization.objects.create(name='Meal Gym', slug='meal-gym')
        self.user = get_user_model().objects.create_user(
            username='client@example.com',
            email='client@example.com',
            password='testpass123',
            first_name='Client',
            last_name='One',
        )
        self.member = OrganizationMember.objects.create(user=self.user, tenant=self.tenant)
        self.client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        self.food = FoodItem.objects.create(
            name='Rice',
            calories_per_100g=130,
            protein_g=2.7,
            carbs_g=28,
            fat_g=0.3,
            fiber_g=0.4,
            is_verified=True,
        )

    def test_nested_create_saves_meals_foods_and_supplements(self):
        serializer = DietPlanSerializer(data={
            'tenant': self.tenant.id,
            'title': 'Fat Loss Template',
            'goal': DietPlan.GoalChoices.FAT_LOSS,
            'calories_target': 1800,
            'protein_target': 140,
            'carbs_target': 180,
            'fat_target': 55,
            'is_active': True,
            'meal_templates': [{
                'day_number': 1,
                'meal_slot': 'breakfast',
                'notes': 'Breakfast',
                'items': [{
                    'food_item': self.food.id,
                    'quantity_g': '150.00',
                    'notes': '',
                }],
                'supplements': [{
                    'supplement_id': 'whey',
                    'name': 'Whey Protein',
                    'amount': '1.00',
                    'unit': 'scoop',
                }],
            }],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        plan = serializer.save()

        self.assertEqual(plan.meals.count(), 1)
        meal = plan.meals.get()
        self.assertEqual(meal.items.count(), 1)
        self.assertEqual(meal.items.get().food_item, self.food)
        self.assertEqual(meal.supplements.count(), 1)
        self.assertEqual(meal.supplements.get().name, 'Whey Protein')

    def test_nested_update_replaces_existing_meals_and_supplements(self):
        plan = DietPlan.objects.create(
            tenant=self.tenant,
            title='Original',
            goal=DietPlan.GoalChoices.MAINTENANCE,
            is_active=True,
        )
        meal = plan.meals.create(
            tenant=self.tenant,
            day_number=1,
            meal_slot='breakfast',
            notes='Old',
        )
        PlannedMealSupplement.objects.create(
            tenant=self.tenant,
            meal=meal,
            supplement_id='old',
            name='Old Supplement',
            amount=1,
            unit='tablet',
        )

        serializer = DietPlanSerializer(plan, data={
            'tenant': self.tenant.id,
            'title': 'Updated',
            'goal': DietPlan.GoalChoices.MUSCLE_GAIN,
            'calories_target': 2400,
            'protein_target': 160,
            'carbs_target': 260,
            'fat_target': 70,
            'is_active': True,
            'meal_templates': [{
                'day_number': 1,
                'meal_slot': 'lunch',
                'notes': 'Lunch',
                'items': [],
                'supplements': [{
                    'supplement_id': 'creatine',
                    'name': 'Creatine',
                    'amount': '5.00',
                    'unit': 'g',
                }],
            }],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()

        self.assertEqual(updated.meals.count(), 1)
        self.assertEqual(updated.meals.get().meal_slot, 'lunch')
        self.assertEqual(updated.meals.get().supplements.get().name, 'Creatine')

    def test_assignment_creation_creates_share_token(self):
        plan = DietPlan.objects.create(
            tenant=self.tenant,
            title='Assigned Plan',
            goal=DietPlan.GoalChoices.FAT_LOSS,
            is_active=True,
        )

        assignment = DietPlanAssignment.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan=plan,
            start_date=date(2026, 8, 1),
        )

        self.assertIsNotNone(assignment.share_token)

    def test_shared_assignment_endpoint_returns_plan_without_auth(self):
        plan = DietPlan.objects.create(
            tenant=self.tenant,
            title='Shared Plan',
            goal=DietPlan.GoalChoices.FAT_LOSS,
            calories_target=1800,
            protein_target=140,
            carbs_target=180,
            fat_target=55,
            is_active=True,
        )
        meal = plan.meals.create(
            tenant=self.tenant,
            day_number=1,
            meal_slot='breakfast',
            notes='Breakfast',
        )
        meal.items.create(
            tenant=self.tenant,
            food_item=self.food,
            quantity_g='150.00',
            notes='',
        )
        PlannedMealSupplement.objects.create(
            tenant=self.tenant,
            meal=meal,
            supplement_id='whey',
            name='Whey Protein',
            amount='1.00',
            unit='scoop',
        )
        assignment = DietPlanAssignment.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan=plan,
            start_date=date(2026, 8, 1),
            adjustments={'checkInDate': '2026-08-07', 'totalCardio': '120'},
        )
        api_client = APIClient()

        response = api_client.get(f'/api/v1/meal/shared-assignments/{assignment.share_token}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['plan_title'], 'Shared Plan')
        self.assertEqual(response.data['client_name'], 'Client One')
        self.assertEqual(response.data['start_date'], '2026-08-01')
        self.assertEqual(response.data['calories_target'], 1800)
        self.assertEqual(response.data['meals'][0]['items'][0]['food_item_name'], 'Rice')
        self.assertEqual(response.data['meals'][0]['supplements'][0]['name'], 'Whey Protein')

    def test_shared_assignment_endpoint_returns_404_for_invalid_token(self):
        api_client = APIClient()

        response = api_client.get('/api/v1/meal/shared-assignments/00000000-0000-0000-0000-000000000000/')

        self.assertEqual(response.status_code, 404)
