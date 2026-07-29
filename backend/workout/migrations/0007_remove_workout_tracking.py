from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0006_workout_plan_template_days'),
    ]

    operations = [
        migrations.DeleteModel(
            name='SetLog',
        ),
        migrations.DeleteModel(
            name='WorkoutLog',
        ),
        migrations.DeleteModel(
            name='WorkoutSession',
        ),
    ]
