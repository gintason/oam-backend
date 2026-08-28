from django.apps import AppConfig


class ReferralsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.referrals"

    def ready(self):
        # Connect the commission receiver to the transaction_settled signal.
        from . import services  # noqa: F401
