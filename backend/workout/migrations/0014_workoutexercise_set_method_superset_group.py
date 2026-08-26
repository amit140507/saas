from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0013_workoutday_day_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutexercise',
            name='set_method',
            field=models.CharField(
                choices=[
                    ('normal', 'Normal'),
                    ('superset', 'Superset'),
                    ('drop_set', 'Drop Set'),
                ],
                default='normal',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='workoutexercise',
            name='superset_group',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
