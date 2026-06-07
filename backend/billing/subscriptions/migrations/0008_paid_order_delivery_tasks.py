import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0003_remove_order_deleted_at_alter_order_client'),
        ('packages', '0006_package_delivery_metadata'),
        ('subscriptions', '0007_move_packagefeature_to_packages'),
    ]

    operations = [
        migrations.AlterField(
            model_name='membership',
            name='order',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='memberships',
                to='orders.order',
            ),
        ),
        migrations.AddField(
            model_name='membership',
            name='order_item',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='membership',
                to='orders.orderitem',
            ),
        ),
        migrations.CreateModel(
            name='PlanDeliveryTask',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('due_date', models.DateField()),
                ('status', models.CharField(choices=[('pending_creation', 'Pending Creation'), ('in_progress', 'In Progress'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='pending_creation', max_length=20)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_plan_delivery_tasks', to=settings.AUTH_USER_MODEL)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plan_delivery_tasks', to='clients.clientprofile')),
                ('membership', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='plan_delivery_task', to='subscriptions.membership')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plan_delivery_tasks', to='orders.order')),
                ('package_plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='plan_delivery_tasks', to='packages.packageplan')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions_plandeliverytask_set', to='tenants.organization')),
            ],
            options={
                'verbose_name': 'Plan Delivery Task',
                'verbose_name_plural': 'Plan Delivery Tasks',
            },
        ),
        migrations.AddIndex(
            model_name='membership',
            index=models.Index(fields=['tenant', 'order'], name='subscriptio_tenant__c795d7_idx'),
        ),
        migrations.AddIndex(
            model_name='plandeliverytask',
            index=models.Index(fields=['tenant', 'status', 'due_date'], name='subscriptio_tenant__a169f6_idx'),
        ),
        migrations.AddIndex(
            model_name='plandeliverytask',
            index=models.Index(fields=['tenant', 'client', 'status'], name='subscriptio_tenant__54370c_idx'),
        ),
        migrations.AddIndex(
            model_name='plandeliverytask',
            index=models.Index(fields=['tenant', 'membership'], name='subscriptio_tenant__dff244_idx'),
        ),
    ]
