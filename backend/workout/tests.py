from django.test import TestCase

from core.tenants.models import Organization
from workout.api.serializers import ExerciseSerializer
from workout.models import Exercise, ExerciseMedia, ExerciseMuscle, Muscle, MuscleGroup


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
            'equipment_required': True,
            'instructions': 'Keep shoulder blades pinned.',
            'is_active': True,
            'media_items': [{'youtube_url': 'https://www.youtube.com/watch?v=abc123'}],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        exercise = serializer.save()

        self.assertEqual(exercise.primary_muscle, self.chest)
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
            equipment_required=True,
            instructions='Control the eccentric.',
            is_active=True,
        )
        ExerciseMuscle.objects.create(exercise=exercise, muscle=self.chest, is_primary=True)
        ExerciseMedia.objects.create(exercise=exercise, youtube_url='https://www.youtube.com/watch?v=fly123')

        data = ExerciseSerializer(exercise).data

        self.assertEqual(data['muscle_group_name'], 'Pectorals')
        self.assertEqual(data['primary_muscle_name'], 'Pectoralis Major')
        self.assertEqual(data['muscles'][0]['muscle_name'], 'Pectoralis Major')
        self.assertEqual(data['media'][0]['youtube_url'], 'https://www.youtube.com/watch?v=fly123')
