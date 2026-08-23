import uuid

from django.db import migrations, models


def populate_share_tokens(apps, schema_editor):
    WorkoutPlanAssignment = apps.get_model('workout', 'WorkoutPlanAssignment')
    for assignment in WorkoutPlanAssignment.objects.filter(share_token__isnull=True):
        assignment.share_token = uuid.uuid4()
        assignment.save(update_fields=['share_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0011_exercise_reps_rest_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutplanassignment',
            name='share_token',
            field=models.UUIDField(null=True, editable=False, db_index=True),
        ),
        migrations.RunPython(populate_share_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='workoutplanassignment',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True),
        ),
    ]
