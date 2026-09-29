from django.db import migrations, models


class Migration(migrations.Migration):
    """Cosmetic tidy: add the created_at db_index that TimeStampedModel declares.
    Tables + data are unchanged; this only adds an index. Safe + fast."""

    dependencies = [
        ("marketplace", "0005_listing_likes_comments"),
    ]

    operations = [
        migrations.AlterField(
            model_name="listingcomment",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="listinglike",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
    ]
