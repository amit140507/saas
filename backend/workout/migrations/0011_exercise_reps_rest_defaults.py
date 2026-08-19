from django.db import migrations, models


REPS_CHOICES = {'4-6', '6-8', '8-10', '10-12', '12-15', '15-20'}
REST_CHOICES = {15, 30, 45, 60, 75, 90, 105, 120}


def copy_reps_rest_to_exercise(apps, schema_editor):
    Exercise = apps.get_model('workout', 'Exercise')
    WorkoutExercise = apps.get_model('workout', 'WorkoutExercise')

    seen_exercise_ids = set()
    workout_exercises = (
        WorkoutExercise.objects
        .exclude(exercise_id__isnull=True)
        .values('exercise_id', 'reps', 'rest')
        .order_by('exercise_id', 'id')
    )

    for workout_exercise in workout_exercises.iterator():
        exercise_id = workout_exercise['exercise_id']
        if exercise_id in seen_exercise_ids:
            continue

        seen_exercise_ids.add(exercise_id)
        updates = {}
        if workout_exercise['reps'] in REPS_CHOICES:
            updates['reps'] = workout_exercise['reps']
        if workout_exercise['rest'] in REST_CHOICES:
            updates['rest'] = workout_exercise['rest']
        if updates:
            Exercise.objects.filter(id=exercise_id).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0010_move_exercise_type_to_exercise'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='reps',
            field=models.CharField(
                blank=True,
                choices=[
                    ('4-6', '4-6'),
                    ('6-8', '6-8'),
                    ('8-10', '8-10'),
                    ('10-12', '10-12'),
                    ('12-15', '12-15'),
                    ('15-20', '15-20'),
                ],
                default='',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='exercise',
            name='rest',
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (15, '15s'),
                    (30, '30s'),
                    (45, '45s'),
                    (60, '60s'),
                    (75, '75s'),
                    (90, '90s'),
                    (105, '105s'),
                    (120, '120s'),
                ],
                help_text='rest in seconds',
                null=True,
            ),
        ),
        migrations.RunPython(copy_reps_rest_to_exercise, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='workoutexercise',
            name='reps',
            field=models.CharField(
                choices=[
                    ('4-6', '4-6'),
                    ('6-8', '6-8'),
                    ('8-10', '8-10'),
                    ('10-12', '10-12'),
                    ('12-15', '12-15'),
                    ('15-20', '15-20'),
                ],
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='workoutexercise',
            name='rest',
            field=models.IntegerField(
                choices=[
                    (15, '15s'),
                    (30, '30s'),
                    (45, '45s'),
                    (60, '60s'),
                    (75, '75s'),
                    (90, '90s'),
                    (105, '105s'),
                    (120, '120s'),
                ],
                help_text='rest in seconds',
            ),
        ),
    ]
