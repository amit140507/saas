from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0007_remove_workout_tracking'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='training_location',
            field=models.CharField(
                blank=True,
                choices=[('gym', 'Gym'), ('home', 'Home')],
                max_length=10,
                null=True,
            ),
        ),
    ]
