from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AirtimeTopup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(db_index=True, max_length=40, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending payment"), ("paid", "Paid — sending"), ("success", "Successful"), ("failed", "Failed"), ("refunded", "Refunded")], default="pending", max_length=12)),
                ("operator_id", models.CharField(max_length=32)),
                ("operator_name", models.CharField(blank=True, max_length=120)),
                ("country_iso", models.CharField(blank=True, max_length=4)),
                ("recipient_number", models.CharField(max_length=32)),
                ("recipient_iso2", models.CharField(max_length=4)),
                ("use_local_amount", models.BooleanField(default=False)),
                ("amount", models.DecimalField(decimal_places=4, default=0, max_digits=20)),
                ("currency", models.CharField(default="USD", max_length=6)),
                ("total_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("cost_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("markup_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("payment_reference", models.CharField(blank=True, db_index=True, max_length=120)),
                ("pay_with", models.CharField(default="wallet", max_length=10)),
                ("reloadly_transaction_id", models.CharField(blank=True, db_index=True, max_length=64)),
                ("delivered_amount", models.DecimalField(decimal_places=4, default=0, max_digits=20)),
                ("delivered_currency", models.CharField(blank=True, max_length=6)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="airtime_topups", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AirtimeApiLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("endpoint", models.CharField(max_length=80)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("status_code", models.PositiveIntegerField(default=0)),
                ("ok", models.BooleanField(default=False)),
                ("error", models.CharField(blank=True, max_length=255)),
                ("topup", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="api_logs", to="reloadly.airtimetopup")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
