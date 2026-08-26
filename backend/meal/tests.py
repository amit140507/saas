from datetime import date
import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from PIL import Image
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from meal.api.serializers import DietPlanSerializer
from meal.models import DietPlan, DietPlanAssignment, FoodItem, MealAdherenceLog, PlannedMealSupplement
from meal.services.pdf_service import _brand_color, _format_date, create_diet_plan_pdf


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
                    'quantity': '150.00',
                    'quantity_unit': 'ml',
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
        self.assertEqual(meal.items.get().quantity_unit, 'ml')
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
            quantity='150.00',
            quantity_unit='g',
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
        self.assertEqual(response.data['meals'][0]['items'][0]['quantity'], '150.00')
        self.assertEqual(response.data['meals'][0]['items'][0]['quantity_unit'], 'g')
        self.assertEqual(response.data['meals'][0]['supplements'][0]['name'], 'Whey Protein')

    def test_shared_assignment_endpoint_returns_404_for_invalid_token(self):
        api_client = APIClient()

        response = api_client.get('/api/v1/meal/shared-assignments/00000000-0000-0000-0000-000000000000/')

        self.assertEqual(response.status_code, 404)

    def test_meal_adherence_upsert_updates_existing_log(self):
        plan = DietPlan.objects.create(
            tenant=self.tenant,
            title='Tracking Plan',
            goal=DietPlan.GoalChoices.FAT_LOSS,
            is_active=True,
        )
        meal = plan.meals.create(
            tenant=self.tenant,
            day_number=1,
            meal_slot='breakfast',
            notes='Oats and eggs',
        )
        DietPlanAssignment.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan=plan,
            start_date=date(2026, 8, 1),
        )
        api_client = APIClient()
        api_client.force_authenticate(self.user)

        first_response = api_client.post(
            f'/api/v1/meal/clients/{self.client_profile.id}/meal-logs/',
            {
                'planned_meal': str(meal.id),
                'log_date': '2026-08-26',
                'status': 'completed',
            },
            format='json',
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )
        second_response = api_client.post(
            f'/api/v1/meal/clients/{self.client_profile.id}/meal-logs/',
            {
                'planned_meal': str(meal.id),
                'log_date': '2026-08-26',
                'status': 'modified',
                'notes': 'Replaced oats with poha',
            },
            format='json',
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(MealAdherenceLog.objects.count(), 1)
        log = MealAdherenceLog.objects.get()
        self.assertEqual(log.status, 'modified')
        self.assertEqual(log.notes, 'Replaced oats with poha')

    def test_current_plan_endpoint_returns_strict_and_flexible_adherence(self):
        plan = DietPlan.objects.create(
            tenant=self.tenant,
            title='Adherence Plan',
            goal=DietPlan.GoalChoices.FAT_LOSS,
            is_active=True,
        )
        breakfast = plan.meals.create(tenant=self.tenant, day_number=1, meal_slot='breakfast', notes='Breakfast')
        lunch = plan.meals.create(tenant=self.tenant, day_number=1, meal_slot='lunch', notes='Lunch')
        dinner = plan.meals.create(tenant=self.tenant, day_number=1, meal_slot='dinner', notes='Dinner')
        snack = plan.meals.create(tenant=self.tenant, day_number=1, meal_slot='evening_snack', notes='Snack')
        assignment = DietPlanAssignment.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan=plan,
            start_date=date(2026, 8, 1),
        )
        MealAdherenceLog.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan_assignment=assignment,
            planned_meal=breakfast,
            log_date=date(2026, 8, 26),
            status='completed',
        )
        MealAdherenceLog.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan_assignment=assignment,
            planned_meal=lunch,
            log_date=date(2026, 8, 26),
            status='completed',
        )
        MealAdherenceLog.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan_assignment=assignment,
            planned_meal=dinner,
            log_date=date(2026, 8, 26),
            status='modified',
        )
        MealAdherenceLog.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            plan_assignment=assignment,
            planned_meal=snack,
            log_date=date(2026, 8, 26),
            status='skipped',
        )
        api_client = APIClient()
        api_client.force_authenticate(self.user)

        response = api_client.get(
            f'/api/v1/meal/clients/{self.client_profile.id}/plans/current/?date=2026-08-26',
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['adherence']['strict_adherence_percent'], 50)
        self.assertEqual(response.data['adherence']['flexible_adherence_percent'], 62.5)

    def test_client_cannot_access_another_client_meal_tracking(self):
        other_user = get_user_model().objects.create_user(
            username='other@example.com',
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='Client',
        )
        other_member = OrganizationMember.objects.create(user=other_user, tenant=self.tenant)
        other_client = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=other_member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        api_client = APIClient()
        api_client.force_authenticate(other_user)

        response = api_client.get(
            f'/api/v1/meal/clients/{self.client_profile.id}/plans/current/?date=2026-08-26',
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotEqual(other_client.id, self.client_profile.id)

    def test_diet_pdf_formats_dates_for_display(self):
        self.assertEqual(_format_date(date(2026, 8, 1)), '01/08/2026')
        self.assertEqual(_format_date('2026-08-07'), '07/08/2026')
        self.assertEqual(_format_date(None), 'No end date')

    def test_diet_pdf_uses_safe_brand_color_fallback(self):
        self.tenant.brand_color = 'tomato'
        self.assertEqual(_brand_color(self.tenant), (79, 70, 229))

        self.tenant.brand_color = '#22C55E'
        self.assertEqual(_brand_color(self.tenant), (34, 197, 94))

    def test_diet_pdf_generates_without_organization_logo(self):
        payload = {
            'clientName': 'Client One',
            'startDate': '2026-08-01',
            'endDate': '',
            'checkInDate': '2026-08-07',
            'totalCardio': '120',
            'calories': 1800,
            'protein': 140,
            'fat': 55,
            'carbs': 180,
            'weightGain': 0,
            'meals': [{
                'time': 'Breakfast',
                'calories': 195,
                'protein': 4,
                'fat': 0,
                'carbs': 42,
                'foods': [{'name': 'Rice', 'amount': '150', 'unit': 'g'}],
                'supplements': [{'name': 'Whey Protein', 'amount': '1', 'unit': 'scoop'}],
            }],
        }

        pdf_bytes = create_diet_plan_pdf(payload, tenant=self.tenant)

        self.assertTrue(pdf_bytes.startswith(b'%PDF'))

    def test_diet_pdf_generates_with_organization_logo(self):
        media_root = tempfile.mkdtemp()
        try:
            with self.settings(MEDIA_ROOT=media_root):
                image = Image.new('RGB', (20, 20), color=(34, 197, 94))
                image_bytes = io.BytesIO()
                image.save(image_bytes, format='PNG')
                self.tenant.logo.save('logo.png', ContentFile(image_bytes.getvalue()), save=True)

                payload = {
                    'clientName': 'Client One',
                    'startDate': '2026-08-01',
                    'endDate': '2026-08-31',
                    'checkInDate': '2026-08-07',
                    'totalCardio': '120',
                    'calories': 1800,
                    'protein': 140,
                    'fat': 55,
                    'carbs': 180,
                    'weightGain': 0,
                    'meals': [{
                        'time': 'Breakfast',
                        'calories': 195,
                        'protein': 4,
                        'fat': 0,
                        'carbs': 42,
                        'foods': [{'name': 'Rice', 'amount': '150', 'unit': 'g'}],
                        'supplements': [],
                    }],
                }

                pdf_bytes = create_diet_plan_pdf(payload, tenant=self.tenant)

                self.assertTrue(pdf_bytes.startswith(b'%PDF'))
        finally:
            shutil.rmtree(media_root, ignore_errors=True)
