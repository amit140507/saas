from datetime import date
import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from workout.api.serializers import ExerciseSerializer, WorkoutPlanAssignmentSerializer, WorkoutPlanSerializer
from workout.models import (
    Exercise,
    ExerciseMedia,
    ExerciseMuscle,
    Muscle,
    MuscleGroup,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlan,
    WorkoutPlanAssignment,
)
from workout.services import assign_workout_plan, replace_client_workout_assignment
from workout.services.pdf_service import _brand_color, _format_date, create_workout_plan_pdf


class ExerciseSerializerTests(TestCase):
    def setUp(self):
        self.tenant = Organization.objects.create(name='Test Gym', slug='test-gym')
        self.pectorals = MuscleGroup.objects.create(name='Pectorals')
        self.triceps_group = MuscleGroup.objects.create(name='Triceps')
        self.delts = MuscleGroup.objects.create(name='Deltoids')
        self.chest = Muscle.objects.create(muscle_group=self.pectorals, name='Pectoralis Major')
        self.triceps = Muscle.objects.create(muscle_group=self.triceps_group, name='Triceps Brachii')
        self.shoulders = Muscle.objects.create(muscle_group=self.delts, name='Anterior Deltoid')

    def test_create_exercise_with_primary_muscle_and_media(self):
        serializer = ExerciseSerializer(data={
            'name': 'Bench Press',
            'primary_muscle': self.chest.id,
            'training_location': Exercise.TrainingLocation.GYM,
            'workout_type': Exercise.WorkoutType.PUSH,
            'equipment_required': True,
            'instructions': 'Keep shoulder blades pinned.',
            'is_active': True,
            'media_items': [{'youtube_url': 'https://www.youtube.com/watch?v=abc123'}],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        exercise = serializer.save()

        self.assertEqual(exercise.primary_muscle, self.chest)
        self.assertEqual(exercise.training_location, Exercise.TrainingLocation.GYM)
        self.assertEqual(exercise.workout_type, Exercise.WorkoutType.PUSH)
        self.assertEqual(exercise.muscles.count(), 1)
        self.assertTrue(exercise.muscles.get(muscle=self.chest).is_primary)
        self.assertEqual(exercise.media.get().youtube_url, 'https://www.youtube.com/watch?v=abc123')

    def test_create_exercise_with_secondary_muscles(self):
        serializer = ExerciseSerializer(data={
            'name': 'Push Up',
            'primary_muscle': self.chest.id,
            'equipment_required': False,
            'instructions': '',
            'is_active': True,
            'muscle_links': [
                {'muscle': self.triceps.id, 'is_primary': False},
                {'muscle': self.shoulders.id, 'is_primary': False},
            ],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        exercise = serializer.save()

        muscles = ExerciseMuscle.objects.filter(exercise=exercise)
        self.assertEqual(muscles.count(), 3)
        self.assertTrue(muscles.get(muscle=self.chest).is_primary)
        self.assertFalse(muscles.get(muscle=self.triceps).is_primary)
        self.assertFalse(muscles.get(muscle=self.shoulders).is_primary)

    def test_update_replaces_muscle_links_and_media(self):
        exercise = Exercise.objects.create(
            name='Old Press',
            primary_muscle=self.chest,
            equipment_required=True,
            instructions='Old notes',
            is_active=True,
        )
        ExerciseMuscle.objects.create(exercise=exercise, muscle=self.chest, is_primary=True)
        ExerciseMuscle.objects.create(exercise=exercise, muscle=self.triceps, is_primary=False)
        ExerciseMedia.objects.create(exercise=exercise, youtube_url='https://www.youtube.com/watch?v=old123')

        serializer = ExerciseSerializer(exercise, data={
            'name': 'Incline Press',
            'primary_muscle': self.shoulders.id,
            'equipment_required': True,
            'instructions': 'Updated notes',
            'is_active': True,
            'muscle_links': [{'muscle': self.chest.id, 'is_primary': False}],
            'media_items': [{'youtube_url': 'https://www.youtube.com/watch?v=new123'}],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()

        self.assertEqual(updated.primary_muscle, self.shoulders)
        self.assertEqual(set(updated.muscles.values_list('muscle_id', flat=True)), {self.shoulders.id, self.chest.id})
        self.assertTrue(updated.muscles.get(muscle=self.shoulders).is_primary)
        self.assertFalse(updated.muscles.get(muscle=self.chest).is_primary)
        self.assertEqual(list(updated.media.values_list('youtube_url', flat=True)), ['https://www.youtube.com/watch?v=new123'])

    def test_duplicate_muscle_links_are_preserved(self):
        serializer = ExerciseSerializer(data={
            'name': 'Dip',
            'primary_muscle': self.chest.id,
            'equipment_required': True,
            'instructions': '',
            'is_active': True,
            'muscle_links': [
                {'muscle': self.chest.id, 'is_primary': True},
                {'muscle': self.triceps.id, 'is_primary': False},
                {'muscle': self.triceps.id, 'is_primary': False},
            ],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        exercise = serializer.save()

        self.assertEqual(exercise.muscles.count(), 4)
        self.assertEqual(exercise.muscles.filter(muscle=self.chest).count(), 2)
        self.assertEqual(exercise.muscles.filter(muscle=self.triceps).count(), 2)

    def test_read_shape_includes_nested_muscles_and_media(self):
        exercise = Exercise.objects.create(
            name='Cable Fly',
            primary_muscle=self.chest,
            training_location=Exercise.TrainingLocation.HOME,
            workout_type=Exercise.WorkoutType.PULL,
            equipment_required=True,
            instructions='Control the eccentric.',
            is_active=True,
        )
        ExerciseMuscle.objects.create(exercise=exercise, muscle=self.chest, is_primary=True)
        ExerciseMedia.objects.create(exercise=exercise, youtube_url='https://www.youtube.com/watch?v=fly123')

        data = ExerciseSerializer(exercise).data

        self.assertEqual(data['muscle_group_name'], 'Pectorals')
        self.assertEqual(data['primary_muscle_name'], 'Pectoralis Major')
        self.assertEqual(data['training_location'], Exercise.TrainingLocation.HOME)
        self.assertEqual(data['workout_type'], Exercise.WorkoutType.PULL)
        self.assertEqual(data['muscles'][0]['muscle_name'], 'Pectoralis Major')
        self.assertEqual(data['media'][0]['youtube_url'], 'https://www.youtube.com/watch?v=fly123')

    def test_invalid_training_location_is_rejected(self):
        serializer = ExerciseSerializer(data={
            'name': 'Invalid Location Exercise',
            'primary_muscle': self.chest.id,
            'training_location': 'park',
            'equipment_required': False,
            'instructions': '',
            'is_active': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('training_location', serializer.errors)

    def test_invalid_workout_type_is_rejected(self):
        serializer = ExerciseSerializer(data={
            'name': 'Invalid Split Exercise',
            'primary_muscle': self.chest.id,
            'workout_type': 'cardio',
            'equipment_required': False,
            'instructions': '',
            'is_active': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('workout_type', serializer.errors)


class WorkoutPlanVersioningTests(TestCase):
    def setUp(self):
        self.tenant = Organization.objects.create(name='Version Gym', slug='version-gym')
        self.user = get_user_model().objects.create_user(
            username='client@example.com',
            email='client@example.com',
            password='testpass123',
        )
        self.member = OrganizationMember.objects.create(user=self.user, tenant=self.tenant)
        self.client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        self.muscle_group = MuscleGroup.objects.create(name='Legs')
        self.muscle = Muscle.objects.create(muscle_group=self.muscle_group, name='Quadriceps')
        self.exercise = Exercise.objects.create(
            name='Squat',
            primary_muscle=self.muscle,
            equipment_required=True,
            instructions='Brace and sit down.',
            is_active=True,
        )
        self.updated_exercise = Exercise.objects.create(
            name='Leg Press',
            primary_muscle=self.muscle,
            equipment_required=True,
            instructions='Control the sled.',
            is_active=True,
        )
        self.plan = WorkoutPlan.objects.create(
            tenant=self.tenant,
            title='Strength Builder',
            difficulty=WorkoutPlan.DifficultyLevel.BEGINNER,
            duration_weeks=8,
            is_active=True,
        )
        self.template_day = WorkoutDay.objects.create(
            tenant=self.tenant,
            plan=self.plan,
            name='Day 1',
            day_number=1,
            notes='Original day',
        )
        self.template_exercise = WorkoutExercise.objects.create(
            workout_day=self.template_day,
            exercise=self.exercise,
            sequence=1,
            body_part='Legs',
            weight=20,
            sets=3,
            reps='10',
            rest=90,
            notes='Original exercise',
        )

    def test_assigning_plan_creates_assignment_snapshot(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )

        snapshot_day = assignment.workout_days.get()
        snapshot_exercise = snapshot_day.exercises.get()

        self.assertIsNone(snapshot_day.plan_id)
        self.assertEqual(snapshot_day.plan_assignment, assignment)
        self.assertEqual(snapshot_day.name, 'Day 1')
        self.assertEqual(snapshot_exercise.exercise, self.exercise)
        self.assertEqual(snapshot_exercise.sets, 3)
        self.assertIsNotNone(assignment.share_token)

    def test_shared_assignment_endpoint_returns_snapshot_without_auth(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        api_client = APIClient()

        response = api_client.get(f'/api/v1/workout/shared-assignments/{assignment.share_token}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['plan_title'], self.plan.title)
        self.assertEqual(response.data['client_name'], self.user.get_full_name())
        self.assertEqual(response.data['start_date'], '2026-07-01')
        self.assertEqual(len(response.data['workout_days']), 1)
        self.assertEqual(response.data['workout_days'][0]['name'], 'Day 1')
        self.assertEqual(response.data['workout_days'][0]['exercises'][0]['exercise_name'], 'Squat')

    def test_shared_assignment_endpoint_returns_404_for_invalid_token(self):
        api_client = APIClient()

        response = api_client.get('/api/v1/workout/shared-assignments/00000000-0000-0000-0000-000000000000/')

        self.assertEqual(response.status_code, 404)

    def test_template_updates_do_not_change_existing_assignment_snapshot(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        snapshot_day = assignment.workout_days.get()
        snapshot_exercise = snapshot_day.exercises.get()

        self.template_day.name = 'Updated Day 1'
        self.template_day.save()
        self.template_exercise.exercise = self.updated_exercise
        self.template_exercise.sets = 5
        self.template_exercise.save()

        snapshot_day.refresh_from_db()
        snapshot_exercise.refresh_from_db()

        self.assertEqual(snapshot_day.name, 'Day 1')
        self.assertEqual(snapshot_exercise.exercise, self.exercise)
        self.assertEqual(snapshot_exercise.sets, 3)

    def test_replacing_assignment_closes_old_one_and_snapshots_updated_template(self):
        old_assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        self.template_exercise.exercise = self.updated_exercise
        self.template_exercise.sets = 5
        self.template_exercise.save()

        new_assignment = replace_client_workout_assignment(
            assignment=old_assignment,
            start_date=date(2026, 7, 8),
            notes='Week 2 update',
        )
        old_assignment.refresh_from_db()

        self.assertEqual(old_assignment.status, WorkoutPlanAssignment.StatusChoices.COMPLETED)
        self.assertEqual(old_assignment.end_date, date(2026, 7, 7))
        self.assertEqual(new_assignment.status, WorkoutPlanAssignment.StatusChoices.ACTIVE)
        self.assertEqual(new_assignment.start_date, date(2026, 7, 8))
        self.assertEqual(new_assignment.workout_days.get().exercises.get().exercise, self.updated_exercise)
        self.assertEqual(new_assignment.workout_days.get().exercises.get().sets, 5)

    def test_assignment_serializer_create_snapshots_template_days(self):
        serializer = WorkoutPlanAssignmentSerializer(data={
            'tenant': self.tenant.id,
            'client': self.client_profile.id,
            'plan': self.plan.id,
            'start_date': '2026-07-01',
            'end_date': None,
            'status': WorkoutPlanAssignment.StatusChoices.ACTIVE,
            'notes': '',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        assignment = serializer.save(tenant=self.tenant)

        self.assertEqual(assignment.workout_days.count(), 1)

    def test_plan_serializer_accepts_active_recovery_and_off_days(self):
        serializer = WorkoutPlanSerializer(data={
            'tenant': self.tenant.id,
            'title': 'Mixed Week',
            'difficulty': WorkoutPlan.DifficultyLevel.BEGINNER,
            'duration_weeks': 4,
            'is_active': True,
            'days': [
                {
                    'name': 'Training Day',
                    'day_number': 1,
                    'day_type': WorkoutDay.DayType.TRAINING,
                    'notes': '',
                    'exercises': [{
                        'exercise': self.exercise.id,
                        'sequence': 1,
                        'body_part': 'Legs',
                        'sets': 3,
                        'reps': '8-10',
                        'rest': 90,
                        'notes': '',
                    }],
                },
                {
                    'name': 'Mobility',
                    'day_number': 2,
                    'day_type': WorkoutDay.DayType.ACTIVE_RECOVERY,
                    'notes': 'Walk and stretch.',
                    'exercises': [],
                },
                {
                    'name': 'Rest',
                    'day_number': 3,
                    'day_type': WorkoutDay.DayType.OFF,
                    'notes': '',
                    'exercises': [],
                },
            ],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        plan = serializer.save()

        day_types = list(plan.template_days.order_by('day_number').values_list('day_type', flat=True))
        self.assertEqual(day_types, [
            WorkoutDay.DayType.TRAINING,
            WorkoutDay.DayType.ACTIVE_RECOVERY,
            WorkoutDay.DayType.OFF,
        ])

    def test_plan_serializer_rejects_off_day_with_exercises(self):
        serializer = WorkoutPlanSerializer(data={
            'tenant': self.tenant.id,
            'title': 'Invalid Rest Day',
            'difficulty': WorkoutPlan.DifficultyLevel.BEGINNER,
            'duration_weeks': 4,
            'is_active': True,
            'days': [{
                'name': 'Rest',
                'day_number': 1,
                'day_type': WorkoutDay.DayType.OFF,
                'notes': '',
                'exercises': [{
                    'exercise': self.exercise.id,
                    'sequence': 1,
                    'body_part': 'Legs',
                    'sets': 3,
                    'reps': '8-10',
                    'rest': 90,
                    'notes': '',
                }],
            }],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('days', serializer.errors)

    def test_active_recovery_day_type_is_copied_to_assignment_snapshot(self):
        recovery_day = WorkoutDay.objects.create(
            tenant=self.tenant,
            plan=self.plan,
            name='Mobility',
            day_number=2,
            day_type=WorkoutDay.DayType.ACTIVE_RECOVERY,
            notes='Walk and stretch.',
        )

        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )

        snapshot_recovery_day = assignment.workout_days.get(day_number=recovery_day.day_number)
        self.assertEqual(snapshot_recovery_day.day_type, WorkoutDay.DayType.ACTIVE_RECOVERY)
        self.assertEqual(snapshot_recovery_day.notes, 'Walk and stretch.')

    def test_assignment_pdf_download_returns_pdf(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        api_client = APIClient()

        response = api_client.post(
            f'/api/v1/workout/assignments/{assignment.id}/download-pdf/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('filename="workout_plan.pdf"', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))

    @override_settings(DEFAULT_FROM_EMAIL='coach@example.com')
    def test_assignment_pdf_send_emails_client_attachment(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        api_client = APIClient()

        response = api_client.post(
            f'/api/v1/workout/assignments/{assignment.id}/send-pdf/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertEqual(mail.outbox[0].attachments[0][0], 'workout_plan.pdf')
        self.assertEqual(mail.outbox[0].attachments[0][2], 'application/pdf')

    def test_assignment_pdf_download_is_tenant_scoped(self):
        other_tenant = Organization.objects.create(name='Other Gym', slug='other-gym')
        other_user = get_user_model().objects.create_user(
            username='other@example.com',
            email='other@example.com',
            password='testpass123',
        )
        other_member = OrganizationMember.objects.create(user=other_user, tenant=other_tenant)
        other_client_profile = ClientProfile.objects.create(
            tenant=other_tenant,
            org_client=other_member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        other_plan = WorkoutPlan.objects.create(
            tenant=other_tenant,
            title='Other Strength Builder',
            difficulty=WorkoutPlan.DifficultyLevel.BEGINNER,
            duration_weeks=8,
            is_active=True,
        )
        other_assignment = assign_workout_plan(
            tenant=other_tenant,
            client=other_client_profile,
            plan=other_plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        api_client = APIClient()

        response = api_client.post(
            f'/api/v1/workout/assignments/{other_assignment.id}/download-pdf/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )

        self.assertEqual(response.status_code, 404)

    @override_settings(DEFAULT_FROM_EMAIL='coach@example.com')
    def test_assignment_pdf_send_requires_client_email(self):
        self.user.email = ''
        self.user.save(update_fields=['email'])
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )
        api_client = APIClient()

        response = api_client.post(
            f'/api/v1/workout/assignments/{assignment.id}/send-pdf/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Assigned client does not have an email address.')
        self.assertEqual(len(mail.outbox), 0)

    def test_workout_pdf_formats_dates_for_display(self):
        self.assertEqual(_format_date(date(2026, 7, 1)), '01/07/2026')
        self.assertEqual(_format_date(None), 'No end date')

    def test_workout_pdf_uses_safe_brand_color_fallback(self):
        self.tenant.brand_color = 'tomato'
        self.assertEqual(_brand_color(self.tenant), (79, 70, 229))

        self.tenant.brand_color = '#22C55E'
        self.assertEqual(_brand_color(self.tenant), (34, 197, 94))

    def test_workout_pdf_generates_without_organization_logo(self):
        assignment = assign_workout_plan(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            assigned_by=None,
            start_date=date(2026, 7, 1),
        )

        pdf_bytes = create_workout_plan_pdf(assignment)

        self.assertTrue(pdf_bytes.startswith(b'%PDF'))

    def test_workout_pdf_generates_with_organization_logo(self):
        media_root = tempfile.mkdtemp()
        try:
            with self.settings(MEDIA_ROOT=media_root):
                image = Image.new('RGB', (20, 20), color=(34, 197, 94))
                image_bytes = io.BytesIO()
                image.save(image_bytes, format='PNG')
                self.tenant.logo.save('logo.png', ContentFile(image_bytes.getvalue()), save=True)

                assignment = assign_workout_plan(
                    tenant=self.tenant,
                    client=self.client_profile,
                    plan=self.plan,
                    assigned_by=None,
                    start_date=date(2026, 7, 1),
                    end_date=date(2026, 8, 1),
                )

                pdf_bytes = create_workout_plan_pdf(assignment)

                self.assertTrue(pdf_bytes.startswith(b'%PDF'))
        finally:
            shutil.rmtree(media_root, ignore_errors=True)
