from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0003_cleanup_bodypart_database'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='workoutplan',
            name='workout_wor_tenant__02db73_idx',
        ),
        migrations.RemoveField(
            model_name='workoutplan',
            name='plan_type',
        ),
        migrations.AddIndex(
            model_name='workoutplan',
            index=models.Index(fields=['tenant', 'is_active'], name='workout_plan_tenant_active_idx'),
        ),
    ]
