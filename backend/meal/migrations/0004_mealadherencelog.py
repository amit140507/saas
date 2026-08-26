import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0007_rename_clients_cli_assigne_3277d4_idx_clients_cli_assigne_8aa79b_idx_and_more'),
        ('meal', '0003_dietplanassignment_share_token_plannedmealsupplement'),
        ('tenants', '0005_organization_brand_color'),
    ]

    operations = [
        migrations.CreateModel(
            name='MealAdherenceLog',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, help_text='When this record was created')),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True, help_text='Last time this record was updated')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('log_date', models.DateField()),
                ('status', models.CharField(choices=[('completed', 'Completed'), ('modified', 'Modified'), ('skipped', 'Skipped')], max_length=20)),
                ('notes', models.TextField(blank=True, default='')),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='meal_adherence_logs', to='clients.clientprofile')),
                ('plan_assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='meal_adherence_logs', to='meal.dietplanassignment')),
                ('planned_meal', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='adherence_logs', to='meal.plannedmeal')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='tenants.organization')),
            ],
            options={
                'verbose_name': 'Meal Adherence Log',
                'verbose_name_plural': 'Meal Adherence Logs',
                'indexes': [
                    models.Index(fields=['tenant', 'client', 'log_date'], name='meal_mealad_tenant__ececfd_idx'),
                    models.Index(fields=['tenant', 'plan_assignment', 'log_date'], name='meal_mealad_tenant__5fae74_idx'),
                    models.Index(fields=['status'], name='meal_mealad_status_1de515_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='mealadherencelog',
            constraint=models.UniqueConstraint(fields=('client', 'log_date', 'planned_meal'), name='unique_meal_adherence_per_client_date_meal'),
        ),
    ]
