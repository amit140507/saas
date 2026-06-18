from django.db import migrations, models


def migrate_card_to_checkout(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(payment_method="card").update(payment_method="checkout")


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_remove_order_deleted_at_alter_order_client"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("cash", "Cash"),
                    ("upi", "UPI"),
                    ("card", "Card"),
                    ("bank_transfer", "Bank Transfer"),
                    ("pos", "POS"),
                    ("checkout", "Checkout"),
                    ("payment_link", "Payment Link"),
                ],
                default="checkout",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_card_to_checkout, migrations.RunPython.noop),
    ]
