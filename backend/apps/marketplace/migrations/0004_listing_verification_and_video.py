import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("marketplace", "0003_alter_sellersubscription_tier_vehicledetail"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listing",
            name="verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="listing",
            name="verified_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="ListingVideo",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("url", models.URLField(max_length=500)),
                ("thumbnail_url", models.URLField(blank=True, max_length=500)),
                ("listing", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="videos", to="marketplace.listing")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]
