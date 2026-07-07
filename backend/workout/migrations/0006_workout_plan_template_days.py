import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0005_global_exercise_catalog_ordering'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='workoutday',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='workoutday',
            name='plan',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='template_days', to='workout.workoutplan'),
        ),
        migrations.AlterField(
            model_name='workoutday',
            name='plan_assignment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='workout_days', to='workout.workoutplanassignment'),
        ),
        migrations.AddField(
            model_name='workoutexercise',
            name='body_part',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='workoutexercise',
            name='video_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='workoutexercise',
            name='rest',
            field=models.IntegerField(help_text='rest in seconds'),
        ),
        migrations.AddConstraint(
            model_name='workoutday',
            constraint=models.UniqueConstraint(condition=models.Q(('plan__isnull', False)), fields=('plan', 'day_number'), name='uniq_workout_day_plan_day'),
        ),
        migrations.AddConstraint(
            model_name='workoutday',
            constraint=models.UniqueConstraint(condition=models.Q(('plan_assignment__isnull', False)), fields=('plan_assignment', 'day_number'), name='uniq_workout_day_assignment_day'),
        ),
        migrations.AddConstraint(
            model_name='workoutday',
            constraint=models.CheckConstraint(condition=models.Q(('plan__isnull', False), ('plan_assignment__isnull', True), _connector='AND') | models.Q(('plan__isnull', True), ('plan_assignment__isnull', False), _connector='AND'), name='workout_day_has_one_owner'),
        ),
    ]
