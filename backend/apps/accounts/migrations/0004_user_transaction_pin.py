from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_alter_user_auth_provider_socialaccount_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="transaction_pin",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
