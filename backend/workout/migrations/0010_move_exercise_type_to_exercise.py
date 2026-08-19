from django.db import migrations, models


def copy_exercise_type_to_exercise(apps, schema_editor):
    Exercise = apps.get_model('workout', 'Exercise')
    WorkoutExercise = apps.get_model('workout', 'WorkoutExercise')

    seen_exercise_ids = set()
    workout_exercises = (
        WorkoutExercise.objects
        .exclude(exercise_id__isnull=True)
        .values('exercise_id', 'exercise_type')
        .order_by('exercise_id', 'id')
    )

    for workout_exercise in workout_exercises.iterator():
        exercise_id = workout_exercise['exercise_id']
        if exercise_id in seen_exercise_ids:
            continue

        seen_exercise_ids.add(exercise_id)
        Exercise.objects.filter(id=exercise_id).update(
            exercise_type=workout_exercise['exercise_type'],
        )


def copy_exercise_type_to_workout_exercise(apps, schema_editor):
    Exercise = apps.get_model('workout', 'Exercise')
    WorkoutExercise = apps.get_model('workout', 'WorkoutExercise')

    exercise_types = Exercise.objects.values_list('id', 'exercise_type')
    for exercise_id, exercise_type in exercise_types.iterator():
        WorkoutExercise.objects.filter(exercise_id=exercise_id).update(
            exercise_type=exercise_type,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0009_exercise_workout_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='exercise_type',
            field=models.IntegerField(
                choices=[
                    (1, 'Body Weight'),
                    (2, 'Pin Loaded Machine'),
                    (3, 'Free Weight'),
                ],
                default=3,
            ),
        ),
        migrations.RunPython(
            copy_exercise_type_to_exercise,
            copy_exercise_type_to_workout_exercise,
        ),
        migrations.RemoveField(
            model_name='workoutexercise',
            name='exercise_type',
        ),
    ]
