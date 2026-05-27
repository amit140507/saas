import random
from datetime import date, timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.db import transaction
from core.accounts.models import User
from core.tenants.models import Organization, Role, OrganizationMember, Permission
from core.tenants.permission_codes import Perms
from core.clients.models import ClientProfile
from core.staff.models import StaffProfile
from workout.planning.models import MuscleGroup, Exercise, WorkoutPlan, WorkoutDay, WorkoutExercise, WorkoutPlanAssignment
from meal.models.planning import FoodItem, DietPlan, DietPlanAssignment, PlannedMeal, PlannedMealItem, MealSlot
from progress.checkins.models import CheckIn, CheckinLog
from progress.measurement.models import WeeklyMeasurement
from billing.packages.models import Package, PackagePlan
from core.tenants.rbac_service import seed_default_roles
from faker import Faker

fake = Faker()

class Command(BaseCommand):
    help = 'Seeds the database with sample tenant, users, and workout data'

    def build_client_profile_defaults(self, tenant, assigned_trainer):
        goal = random.choice(
            [
                ClientProfile.GoalChoices.FAT_LOSS,
                ClientProfile.GoalChoices.MUSCLE_GAIN,
                ClientProfile.GoalChoices.MAINTENANCE,
            ]
        )
        return {
            'tenant': tenant,
            'assigned_trainer': assigned_trainer,
            'status': ClientProfile.StatusChoices.ACTIVE,
            'goal': goal,
            'referral_source': random.choice(['instagram', 'website', 'walk_in', 'friend']),
            'dob': fake.date_of_birth(minimum_age=18, maximum_age=55),
            'sex': random.choice(
                [
                    ClientProfile.SexChoices.MALE,
                    ClientProfile.SexChoices.FEMALE,
                    ClientProfile.SexChoices.OTHER,
                ]
            ),
            'phone': fake.msisdn()[:15],
            'date_of_joining': date.today() - timedelta(days=random.randint(15, 180)),
            'activated_at': timezone.now() - timedelta(days=random.randint(1, 60)),
        }

    def seed_checkin_logs(self, tenant, client_profile):
        start_date = date.today() - timedelta(days=6)
        checkin_root, _ = CheckIn.objects.get_or_create(
            tenant=tenant,
            client=client_profile,
            start_date=start_date,
        )

        stool_choices = [choice[0] for choice in CheckinLog.STOOL_QUALITY_CHOICES]
        for offset in range(7):
            log_date = start_date + timedelta(days=offset)
            did_cardio = random.choice([True, False])
            did_strength_training = random.choice([True, False])
            had_off_plan_meal = random.choice([True, False])

            CheckinLog.objects.update_or_create(
                tenant=tenant,
                plan=checkin_root,
                date=log_date,
                defaults={
                    'week_number': 1,
                    'fluid_intake': round(random.uniform(2.0, 4.5), 1),
                    'hunger_level': random.choice(CheckinLog.Rating.values),
                    'craving_level': random.choice(CheckinLog.Rating.values),
                    'off_plan_meal': had_off_plan_meal,
                    'off_plan_meal_details': (
                        random.choice(['dessert', 'pizza night', 'late-night snacking'])
                        if had_off_plan_meal else None
                    ),
                    'steps': random.randint(5000, 14000),
                    'cardio': did_cardio,
                    'cardio_duration': random.randint(20, 45) if did_cardio else 0,
                    'strength_training': did_strength_training,
                    'strength_training_details': (
                        random.choice(['upper body session', 'leg day', 'full body workout'])
                        if did_strength_training else None
                    ),
                    'motivation': random.choice(CheckinLog.Rating.values),
                    'performance': random.choice(CheckinLog.Rating.values),
                    'muscle_soreness': random.choice(CheckinLog.Rating.values),
                    'energy_levels': random.choice(CheckinLog.Rating.values),
                    'stress_levels': random.choice(CheckinLog.Rating.values),
                    'stool_frequency': random.randint(1, 3),
                    'stool_quality': random.choice(stool_choices),
                    'gi_distress': random.choice([None, 'bloating', 'constipation']),
                    'sleep_duration': round(random.uniform(6.0, 8.5), 1),
                    'sleep_quality': random.choice(CheckinLog.Rating.values),
                    'notes': random.choice([
                        'Stayed consistent with meals and training.',
                        'Energy dipped in the afternoon but finished the workout.',
                        'Recovered well and hit step goal.',
                    ]),
                },
            )

        return checkin_root

    def handle(self, *args, **options):
        self.stdout.write("Starting data seeding...")
        
        try:
            with transaction.atomic():
                self.seed_all()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during seeding: {e}"))
            raise e

    def seed_all(self):
        # 0. Sync global permissions
        all_perm_codes = Perms.all_perms()
        for code in all_perm_codes:
            Permission.objects.get_or_create(
                code=code, 
                defaults={'description': f"Permission to {code.replace('_', ' ')}"}
            )
        self.stdout.write("Synced global permissions.")

        # 0.1 Global Food Database
        food_items = [
            ('Oats', 389, 16.9, 66.3, 6.9),
            ('Chicken Breast', 165, 31, 0, 3.6),
            ('Rice', 130, 2.7, 28, 0.3),
            ('Eggs', 155, 13, 1.1, 11),
            ('Broccoli', 34, 2.8, 6.6, 0.4),
            ('Peanut Butter', 588, 25, 20, 50),
        ]
        food_objs = []
        for name, cal, pro, carb, fat in food_items:
            f, _ = FoodItem.objects.get_or_create(
                name=name,
                defaults={
                    'calories_per_100g': cal,
                    'protein_g': pro,
                    'carbs_g': carb,
                    'fat_g': fat,
                    'is_verified': True
                }
            )
            food_objs.append(f)
        self.stdout.write("Synced global food items.")

        # 0.2 Global Muscle Groups
        muscle_names = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
        muscles = {}
        for name in muscle_names:
            mg, _ = MuscleGroup.objects.get_or_create(name=name)
            muscles[name] = mg
        self.stdout.write("Synced global muscle groups.")

        # 1. Gyms Configuration
        gyms_data = [
            {'name': 'Iron Paradise Gym', 'slug': 'iron-paradise', 'city': 'Mumbai'},
            {'name': 'Muscle Beach', 'slug': 'muscle-beach', 'city': 'Goa'},
            {'name': 'Power House', 'slug': 'power-house', 'city': 'Delhi'},
            {'name': 'The Fit Lab', 'slug': 'fit-lab', 'city': 'Bangalore'},
        ]

        for gym_info in gyms_data:
            self.stdout.write(f"\n--- Seeding Gym: {gym_info['name']} ---")
            
            tenant, created = Organization.objects.get_or_create(
                slug=gym_info['slug'],
                defaults={
                    'name': gym_info['name'],
                    'city': gym_info['city'],
                    'state': 'State',
                    'country': 'India',
                    'is_active': True,
                }
            )
            if created:
                seed_default_roles(tenant)
            
            owner_role = Role.objects.get(tenant=tenant, code='owner')
            trainer_role = Role.objects.get(tenant=tenant, code='trainer')
            client_role = Role.objects.get(tenant=tenant, code='client')

            # 2. Staff (5 trainers per gym)
            trainers = []
            for i in range(5):
                staff_username = f"staff_{gym_info['slug']}_{i}"
                staff_user, _ = User.objects.get_or_create(
                    username=staff_username,
                    defaults={'email': f"{staff_username}@gym.com", 'first_name': fake.first_name(), 'last_name': 'Trainer'}
                )
                staff_user.set_password('password123')
                staff_user.save()

                membership, _ = OrganizationMember.objects.get_or_create(
                    user=staff_user, tenant=tenant, defaults={'role': trainer_role}
                )
                
                profile, _ = StaffProfile.objects.get_or_create(
                    org_staff=membership,
                    defaults={
                        'tenant': tenant,
                        'bio': fake.sentence(),
                        'specialization': random.choice(['Weight Loss', 'Bodybuilding', 'Yoga', 'Strength']),
                    }
                )
                trainers.append(profile)
            
            self.stdout.write(f"Seeded 5 trainers for {tenant.name}.")

            # 3. Packages
            package, _ = Package.objects.get_or_create(
                tenant=tenant,
                name='Standard Membership',
                defaults={'description': 'Basic gym access', 'max_freezes': 5}
            )
            PackagePlan.objects.get_or_create(
                tenant=tenant, package=package, name='Monthly Plan', 
                defaults={
                    'price': 2000,
                    'billing_cycle': PackagePlan.BillingCycleChoices.MONTHLY,
                    'duration_in_days': 30,
                }
            )
            PackagePlan.objects.get_or_create(
                tenant=tenant, package=package, name='Annual Plan', 
                defaults={
                    'price': 18000,
                    'billing_cycle': PackagePlan.BillingCycleChoices.YEARLY,
                    'duration_in_days': 365,
                }
            )

            # 4. Exercises for this tenant
            exercises = []
            exercise_names = [
                ('Bench Press', 'Chest'), ('Deadlift', 'Back'), ('Squat', 'Legs'), 
                ('OHP', 'Shoulders'), ('Bicep Curl', 'Arms'), ('Plank', 'Core')
            ]
            for ex_name, m_name in exercise_names:
                ex, _ = Exercise.objects.get_or_create(
                    name=ex_name, tenant=tenant,
                    defaults={'muscle_group': muscles[m_name], 'equipment_required': True}
                )
                exercises.append(ex)

            # 5. Clients (10 per gym)
            for i in range(10):
                client_username = f"client_{gym_info['slug']}_{i}"
                client_user, _ = User.objects.get_or_create(
                    username=client_username,
                    defaults={'email': f"{client_username}@example.com", 'first_name': fake.first_name(), 'last_name': fake.last_name()}
                )
                client_user.set_password('password123')
                client_user.save()

                client_membership, _ = OrganizationMember.objects.get_or_create(
                    user=client_user, tenant=tenant, defaults={'role': client_role}
                )
                
                assigned_trainer = random.choice(trainers)
                client_profile, _ = ClientProfile.objects.update_or_create(
                    org_client=client_membership,
                    defaults=self.build_client_profile_defaults(
                        tenant=tenant,
                        assigned_trainer=assigned_trainer,
                    ),
                )

                # 6. Workout Plan for Client
                w_plan = (
                    WorkoutPlan.objects
                    .filter(
                        tenant=tenant,
                        title=f"Plan for {client_user.first_name}",
                        plan_type=WorkoutPlan.PlanType.WORKOUT,
                    )
                    .order_by('created_at')
                    .first()
                )
                if w_plan is None:
                    w_plan = WorkoutPlan.objects.create(
                        tenant=tenant,
                        title=f"Plan for {client_user.first_name}",
                        plan_type=WorkoutPlan.PlanType.WORKOUT,
                        created_by=assigned_trainer.user,
                    )

                w_assignment = (
                    WorkoutPlanAssignment.objects
                    .filter(tenant=tenant, client=client_profile, plan=w_plan)
                    .order_by('created_at')
                    .first()
                )
                if w_assignment is None:
                    w_assignment = WorkoutPlanAssignment.objects.create(
                        tenant=tenant,
                        client=client_profile,
                        plan=w_plan,
                        assigned_by=assigned_trainer.user,
                        start_date=date.today(),
                    )
                for d in range(1, 4):
                    day, _ = WorkoutDay.objects.get_or_create(
                        tenant=tenant,
                        plan_assignment=w_assignment,
                        day_number=d,
                        defaults={'name': f"Day {d}"}
                    )
                    for ex in random.sample(exercises, 2):
                        WorkoutExercise.objects.get_or_create(
                            workout_day=day,
                            exercise=ex,
                            defaults={'sets': 3, 'reps': '12', 'rest': 90}
                        )

                # 7. Diet Plan for Client
                d_plan = (
                    DietPlan.objects
                    .filter(tenant=tenant, title=f"Diet for {client_user.first_name}")
                    .order_by('created_at')
                    .first()
                )
                if d_plan is None:
                    d_plan = DietPlan.objects.create(
                        tenant=tenant,
                        title=f"Diet for {client_user.first_name}",
                        calories_target=2500,
                        created_by=assigned_trainer,
                    )

                diet_assignment = (
                    DietPlanAssignment.objects
                    .filter(tenant=tenant, client=client_profile, plan=d_plan)
                    .order_by('created_at')
                    .first()
                )
                if diet_assignment is None:
                    DietPlanAssignment.objects.create(
                        tenant=tenant,
                        client=client_profile,
                        plan=d_plan,
                        start_date=date.today(),
                    )
                for d in range(1, 2): # Just 1 day for seed
                    for slot in [MealSlot.BREAKFAST, MealSlot.LUNCH, MealSlot.DINNER]:
                        meal, _ = PlannedMeal.objects.get_or_create(
                            tenant=tenant,
                            plan=d_plan,
                            day_number=d,
                            meal_slot=slot
                        )
                        PlannedMealItem.objects.get_or_create(
                            tenant=tenant,
                            meal=meal,
                            food_item=random.choice(food_objs),
                            defaults={'quantity_g': 150}
                        )

                # 8. Check-ins & Measurements
                self.seed_checkin_logs(tenant=tenant, client_profile=client_profile)
                WeeklyMeasurement.objects.get_or_create(
                    tenant=tenant,
                    client=client_profile,
                    weight=random.randint(60, 90),
                    chest=random.randint(90, 110),
                    abdomen=random.randint(70, 90)
                )

            self.stdout.write(f"Seeded 10 clients with plans and progress for {tenant.name}.")

        self.stdout.write(self.style.SUCCESS("\nAll gyms and data seeded successfully!"))
