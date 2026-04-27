from django.db import migrations


def cleanup_legacy_metrics(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app = %s", ['metrics'])
        cursor.execute(
            "UPDATE django_content_type SET app_label = %s WHERE app_label = %s",
            ['measurement', 'metrics'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('measurement', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cleanup_legacy_metrics, migrations.RunPython.noop),
    ]
