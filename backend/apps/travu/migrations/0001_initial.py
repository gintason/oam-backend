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
            name="BusBooking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(db_index=True, max_length=40, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending payment"), ("paid", "Paid — booking"), ("confirmed", "Confirmed"), ("failed", "Failed"), ("refunded", "Refunded")], default="pending", max_length=12)),
                ("departure_state", models.CharField(max_length=40)),
                ("destination_state", models.CharField(max_length=40)),
                ("trip_id", models.CharField(max_length=40)),
                ("order_id", models.CharField(max_length=40)),
                ("origin_id", models.CharField(max_length=40)),
                ("destination_id", models.CharField(max_length=40)),
                ("boarding_at", models.CharField(blank=True, max_length=40)),
                ("provider", models.CharField(blank=True, max_length=40)),
                ("trip_date", models.CharField(max_length=20)),
                ("narration", models.CharField(blank=True, max_length=255)),
                ("departure_terminal", models.CharField(blank=True, max_length=255)),
                ("destination_terminal", models.CharField(blank=True, max_length=255)),
                ("vehicle_no", models.CharField(blank=True, max_length=120)),
                ("seat_numbers", models.CharField(max_length=120)),
                ("total_seats", models.PositiveIntegerField(default=0)),
                ("amount_per_seat", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("currency", models.CharField(default="NGN", max_length=3)),
                ("agent_email", models.EmailField(blank=True, max_length=254)),
                ("payment_reference", models.CharField(blank=True, db_index=True, max_length=120)),
                ("travu_order_id", models.CharField(blank=True, db_index=True, max_length=64)),
                ("travu_order_number", models.CharField(blank=True, max_length=64)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bus_bookings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BusPassenger",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(blank=True, max_length=10)),
                ("name", models.CharField(max_length=120)),
                ("age", models.CharField(blank=True, max_length=4)),
                ("sex", models.CharField(blank=True, max_length=10)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("blood", models.CharField(blank=True, max_length=6)),
                ("next_of_kin", models.CharField(blank=True, max_length=120)),
                ("next_of_kin_phone", models.CharField(blank=True, max_length=20)),
                ("is_primary", models.BooleanField(default=False)),
                ("seat_number", models.CharField(blank=True, max_length=8)),
                ("booking", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="passengers", to="travu.busbooking")),
            ],
            options={"ordering": ["-is_primary", "id"]},
        ),
        migrations.CreateModel(
            name="TravuApiLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("endpoint", models.CharField(max_length=64)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("status_code", models.PositiveIntegerField(default=0)),
                ("ok", models.BooleanField(default=False)),
                ("error", models.CharField(blank=True, max_length=255)),
                ("booking", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="api_logs", to="travu.busbooking")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
