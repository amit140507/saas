from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0008_exercise_training_location'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='workout_type',
            field=models.CharField(
                blank=True,
                choices=[('push', 'Push'), ('pull', 'Pull'), ('legs', 'Legs')],
                max_length=20,
                null=True,
            ),
        ),
    ]
