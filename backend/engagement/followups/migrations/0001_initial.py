# Generated manually to register the existing Followup model.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clients', '0007_rename_clients_cli_assigne_3277d4_idx_clients_cli_assigne_8aa79b_idx_and_more'),
        ('tenants', '0005_organization_brand_color'),
    ]

    operations = [
        migrations.CreateModel(
            name='Followup',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('followup_type', models.CharField(choices=[('call', 'Phone Call'), ('whatsapp', 'WhatsApp'), ('email', 'Email'), ('in_person', 'In-Person'), ('sms', 'SMS')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed'), ('missed', 'Missed'), ('rescheduled', 'Rescheduled')], default='pending', max_length=20)),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium', max_length=10)),
                ('scheduled_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('outcome', models.TextField(blank=True, null=True)),
                ('assigned_to', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_followups', to=settings.AUTH_USER_MODEL)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='followups', to='clients.clientprofile')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='followups_created', to=settings.AUTH_USER_MODEL)),
                ('next_followup', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rescheduled_from', to='followups.followup')),
                ('tenant', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to='tenants.organization')),
            ],
            options={
                'verbose_name': 'Follow-Up',
                'verbose_name_plural': 'Follow-Ups',
                'ordering': ['scheduled_at'],
            },
        ),
        migrations.AddIndex(
            model_name='followup',
            index=models.Index(fields=['tenant', 'status'], name='followups_f_tenant__3c3229_idx'),
        ),
        migrations.AddIndex(
            model_name='followup',
            index=models.Index(fields=['assigned_to', 'scheduled_at'], name='followups_f_assigne_d4a79c_idx'),
        ),
    ]
