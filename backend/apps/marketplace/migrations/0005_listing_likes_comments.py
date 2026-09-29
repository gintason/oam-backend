import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("marketplace", "0004_listing_verification_and_video"),
    ]

    operations = [
        migrations.CreateModel(
            name="ListingLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("listing", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="likes", to="marketplace.listing")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="listing_likes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("listing", "user")}},
        ),
        migrations.CreateModel(
            name="ListingComment",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.TextField(max_length=1000)),
                ("listing", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="marketplace.listing")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="listing_comments", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="listinglike",
            index=models.Index(fields=["listing"], name="mkt_like_listing_idx"),
        ),
        migrations.AddIndex(
            model_name="listingcomment",
            index=models.Index(fields=["listing", "-created_at"], name="mkt_comment_listing_idx"),
        ),
    ]
