from django.db import migrations, models


def add_billing_cycle_column(apps, schema_editor):
    table_name = 'packages_packageplan'
    column_name = 'billing_cycle'
    existing_columns = {
        column.name
        for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(),
            table_name,
        )
    }

    if column_name not in existing_columns:
        schema_editor.execute(
            "ALTER TABLE packages_packageplan "
            "ADD COLUMN billing_cycle varchar(20) NOT NULL DEFAULT 'monthly'"
        )

    schema_editor.execute(
        "UPDATE packages_packageplan "
        "SET billing_cycle = 'monthly' "
        "WHERE billing_cycle IS NULL OR billing_cycle = ''"
    )


def remove_billing_cycle_column(apps, schema_editor):
    table_name = 'packages_packageplan'
    column_name = 'billing_cycle'
    existing_columns = {
        column.name
        for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(),
            table_name,
        )
    }

    if column_name in existing_columns:
        schema_editor.execute("ALTER TABLE packages_packageplan DROP COLUMN billing_cycle")


class Migration(migrations.Migration):

    dependencies = [
        ('packages', '0006_package_delivery_metadata'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_billing_cycle_column, remove_billing_cycle_column),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='packageplan',
                    name='billing_cycle',
                    field=models.CharField(
                        choices=[
                            ('monthly', 'Monthly'),
                            ('quarterly', 'Quarterly'),
                            ('yearly', 'Yearly'),
                            ('fixed', 'Fixed term'),
                        ],
                        default='monthly',
                        max_length=20,
                    ),
                ),
            ],
        ),
    ]
