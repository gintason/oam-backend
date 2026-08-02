import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Beneficiary(models.Model):
    """
    A phone number, meter or smartcard a user has paid to before.

    One row per (user, service, identifier). We don't keep a full history of
    every purchase here — the order log already does that. This is the short,
    de-duplicated "pay them again" list that sits on the purchase screens, so
    the useful state is just the identifier plus the details needed to re-fill
    the form (which provider, and the last verified customer name).
    """

    class Service(models.TextChoices):
        AIRTIME = "airtime", "Airtime"
        DATA = "data", "Data"
        ELECTRICITY = "electricity", "Electricity"
        CABLE = "cable", "Cable TV"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="beneficiaries",
    )
    service_type = models.CharField(max_length=20, choices=Service.choices)

    # The thing being paid: phone number, meter number, or smartcard/IUC number.
    account_identifier = models.CharField(max_length=64)

    # Enough to re-select the provider on the form. `biller_code` is what the
    # form's <select> actually binds to; `biller_name` is only for display.
    biller_code = models.CharField(max_length=64, blank=True)
    biller_name = models.CharField(max_length=120, blank=True)

    # Last resolved account holder (meters / smartcards). Blank for airtime/data.
    customer_name = models.CharField(max_length=200, blank=True)

    # Optional user-set nickname, e.g. "Mum's line" or "Shop meter".
    label = models.CharField(max_length=80, blank=True)

    last_used_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One entry per identifier per service, per user — the upsert key.
        constraints = [
            models.UniqueConstraint(
                fields=["user", "service_type", "account_identifier"],
                name="uniq_user_service_identifier",
            )
        ]
        ordering = ["-last_used_at"]
        indexes = [
            models.Index(fields=["user", "service_type", "-last_used_at"]),
        ]
        verbose_name_plural = "beneficiaries"

    def __str__(self):
        return f"{self.get_service_type_display()}: {self.account_identifier}"
