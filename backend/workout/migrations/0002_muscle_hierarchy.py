import django.db.models.deletion
from django.core.management.color import no_style
from django.db import migrations, models


def migrate_flat_muscles_to_hierarchy(apps, schema_editor):
    MuscleGroup = apps.get_model('workout', 'MuscleGroup')
    Muscle = apps.get_model('workout', 'Muscle')
    Exercise = apps.get_model('workout', 'Exercise')

    for old_group in MuscleGroup.objects.all().order_by('id'):
        Muscle.objects.get_or_create(
            id=old_group.id,
            defaults={
                'muscle_group': old_group,
                'name': 'General',
            },
        )

    for exercise in Exercise.objects.exclude(muscle_group_id__isnull=True):
        exercise.primary_muscle_id = exercise.muscle_group_id
        exercise.save(update_fields=['primary_muscle'])

    sequence_sql = schema_editor.connection.ops.sequence_reset_sql(no_style(), [Muscle])
    with schema_editor.connection.cursor() as cursor:
        for sql in sequence_sql:
            cursor.execute(sql)


def reverse_hierarchy_to_flat_muscles(apps, schema_editor):
    Exercise = apps.get_model('workout', 'Exercise')

    for exercise in Exercise.objects.exclude(primary_muscle_id__isnull=True):
        exercise.muscle_group_id = exercise.primary_muscle_id
        exercise.save(update_fields=['muscle_group'])


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Muscle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('muscle_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='muscles', to='workout.musclegroup')),
            ],
            options={
                'ordering': ['muscle_group__name', 'name'],
            },
        ),
        migrations.AddField(
            model_name='exercise',
            name='primary_muscle',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='primary_exercises', to='workout.muscle'),
        ),
        migrations.RunPython(migrate_flat_muscles_to_hierarchy, reverse_hierarchy_to_flat_muscles),
        migrations.AlterModelOptions(
            name='musclegroup',
            options={'ordering': ['name']},
        ),
        migrations.AlterField(
            model_name='exercisemuscle',
            name='muscle',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='workout.muscle'),
        ),
        migrations.RemoveIndex(
            model_name='exercise',
            name='workout_exe_tenant__4b0cbd_idx',
        ),
        migrations.RemoveField(
            model_name='exercise',
            name='muscle_group',
        ),
        migrations.RemoveField(
            model_name='musclegroup',
            name='is_primary',
        ),
        migrations.AddConstraint(
            model_name='musclegroup',
            constraint=models.UniqueConstraint(fields=('name',), name='unique_muscle_group_name'),
        ),
        migrations.AddConstraint(
            model_name='muscle',
            constraint=models.UniqueConstraint(fields=('muscle_group', 'name'), name='unique_muscle_per_group'),
        ),
        migrations.AddIndex(
            model_name='exercise',
            index=models.Index(fields=['tenant', 'primary_muscle'], name='workout_exe_tenant__4a5062_idx'),
        ),
    ]
