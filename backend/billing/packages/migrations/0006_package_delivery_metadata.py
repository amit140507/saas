from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('packages', '0005_move_packagefeature_from_subscriptions'),
    ]

    operations = [
        migrations.AddField(
            model_name='package',
            name='package_type',
            field=models.CharField(
                choices=[
                    ('gym', 'Gym'),
                    ('online', 'Online'),
                    ('pt', 'Personal Training'),
                    ('other', 'Other'),
                ],
                default='gym',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='packageplan',
            name='plan_delivery_days',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Days after payment by which a personalized plan should be delivered.',
                null=True,
            ),
        ),
    ]
