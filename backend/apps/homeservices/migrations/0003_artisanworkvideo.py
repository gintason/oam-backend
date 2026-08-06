import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("homeservices", "0002_artisanserviceimage_artisanverification"),
    ]

    operations = [
        migrations.CreateModel(
            name="ArtisanWorkVideo",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("video_url", models.URLField(max_length=600)),
                ("public_id", models.CharField(blank=True, max_length=255)),
                ("caption", models.CharField(blank=True, max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=10,
                    ),
                ),
                ("review_note", models.CharField(blank=True, max_length=300)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "artisan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="work_videos",
                        to="homeservices.artisanprofile",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_artisan_videos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="artisanworkvideo",
            index=models.Index(
                fields=["artisan", "status"], name="hs_workvideo_art_status"
            ),
        ),
    ]
