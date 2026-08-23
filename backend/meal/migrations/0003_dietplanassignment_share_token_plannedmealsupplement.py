import uuid

from django.db import migrations, models
import django.db.models.deletion


def populate_share_tokens(apps, schema_editor):
    DietPlanAssignment = apps.get_model('meal', 'DietPlanAssignment')
    for assignment in DietPlanAssignment.objects.filter(share_token__isnull=True):
        assignment.share_token = uuid.uuid4()
        assignment.save(update_fields=['share_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('meal', '0002_remove_dietlog_deleted_at_remove_dietplan_deleted_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dietplanassignment',
            name='share_token',
            field=models.UUIDField(null=True, editable=False, db_index=True),
        ),
        migrations.CreateModel(
            name='PlannedMealSupplement',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, help_text='When this record was created')),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True, help_text='Last time this record was updated')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='tenants.organization')),
                ('supplement_id', models.CharField(blank=True, default='', max_length=100)),
                ('name', models.CharField(max_length=255)),
                ('amount', models.DecimalField(blank=True, decimal_places=2, max_digits=7, null=True)),
                ('unit', models.CharField(blank=True, default='', max_length=50)),
                ('meal', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supplements', to='meal.plannedmeal')),
            ],
            options={
                'verbose_name': 'Planned Meal Supplement',
                'verbose_name_plural': 'Planned Meal Supplements',
            },
        ),
        migrations.RunPython(populate_share_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='dietplanassignment',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True),
        ),
    ]
