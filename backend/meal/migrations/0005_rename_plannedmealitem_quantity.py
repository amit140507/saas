from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meal', '0004_mealadherencelog'),
    ]

    operations = [
        migrations.RenameField(
            model_name='plannedmealitem',
            old_name='quantity_g',
            new_name='quantity',
        ),
        migrations.AddField(
            model_name='plannedmealitem',
            name='quantity_unit',
            field=models.CharField(default='g', max_length=10),
        ),
    ]
