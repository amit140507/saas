from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0012_workoutplanassignment_share_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutday',
            name='day_type',
            field=models.CharField(
                choices=[
                    ('training', 'Training'),
                    ('active_recovery', 'Active Recovery'),
                    ('off', 'Off Day'),
                ],
                default='training',
                max_length=20,
            ),
        ),
    ]
