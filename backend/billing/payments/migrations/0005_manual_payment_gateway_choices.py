from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_rename_payments_ch_tenant__fd6985_idx_payments_ch_tenant__555719_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="gateway",
            field=models.CharField(
                choices=[
                    ("stripe", "Stripe"),
                    ("razorpay", "Razorpay"),
                    ("cash", "Cash"),
                    ("upi", "UPI"),
                    ("card", "Card"),
                    ("bank_transfer", "Bank Transfer"),
                    ("pos", "POS"),
                    ("other", "Other"),
                ],
                max_length=20,
            ),
        ),
    ]
