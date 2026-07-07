import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0004_remove_workoutplan_plan_type'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='exercise',
            name='workout_exe_tenant__4a5062_idx',
        ),
        migrations.RemoveField(
            model_name='exercise',
            name='tenant',
        ),
        migrations.AlterModelOptions(
            name='exercise',
            options={'ordering': ['name']},
        ),
        migrations.AddIndex(
            model_name='exercise',
            index=models.Index(fields=['primary_muscle', 'is_active'], name='work_exe_primary_active_idx'),
        ),
        migrations.AddField(
            model_name='exercisemuscle',
            name='sequence',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterModelOptions(
            name='exercisemuscle',
            options={'ordering': ['sequence', 'id']},
        ),
        migrations.AddIndex(
            model_name='exercisemuscle',
            index=models.Index(fields=['exercise', 'sequence'], name='exercise_muscle_sequence_idx'),
        ),
        migrations.AlterField(
            model_name='workoutday',
            name='plan_assignment',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workout_days', to='workout.workoutplanassignment'),
        ),
        migrations.AlterField(
            model_name='workoutexercise',
            name='exercise',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planned_instances', to='workout.exercise'),
        ),
        migrations.AlterField(
            model_name='workoutexercise',
            name='workout_day',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exercises', to='workout.workoutday'),
        ),
        migrations.AddField(
            model_name='workoutexercise',
            name='sequence',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterModelOptions(
            name='workoutexercise',
            options={'ordering': ['sequence', 'id']},
        ),
        migrations.AddIndex(
            model_name='workoutexercise',
            index=models.Index(fields=['workout_day', 'sequence'], name='workout_ex_day_sequence_idx'),
        ),
        migrations.AddField(
            model_name='setlog',
            name='sequence',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterModelOptions(
            name='setlog',
            options={'ordering': ['sequence', 'set_number', 'id']},
        ),
        migrations.AddIndex(
            model_name='setlog',
            index=models.Index(fields=['workout_log', 'sequence'], name='setlog_workout_sequence_idx'),
        ),
    ]
