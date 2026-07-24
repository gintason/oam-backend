"""
Affiliate attribution.

Every time we hand a user off to an affiliate partner we record an
AffiliateClick. Its id becomes the `sub_id` we attach to the outgoing link, so
when the partner reports a conversion (via postback or monthly statement) we
can match the commission back to the user and the service.

The row is created once and then only its conversion fields are updated, so it
inherits UUIDModel + TimeStampedModel but not ImmutableModel.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel, UUIDModel


class AffiliateClick(UUIDModel, TimeStampedModel):
    class Category(models.TextChoices):
        FLIGHTS = "flights"
        CARHIRE = "carhire"
        HOTELS = "hotels"
        DELIVERY = "delivery"
        REMITTANCE = "remittance"

    class Status(models.TextChoices):
        CLICKED = "clicked"
        CONVERTED = "converted"
        REJECTED = "rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="affiliate_clicks",
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    provider = models.CharField(max_length=40)        # e.g. "travelpayouts"
    program = models.CharField(max_length=60)         # e.g. "travelpayouts:flights"
    target_url = models.URLField(max_length=1000)     # where we sent them
    params = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CLICKED)
    commission_amount = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    commission_currency = models.CharField(max_length=3, blank=True)
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["provider", "created_at"]),
        ]

    def __str__(self):
        return f"{self.program} ({self.status})"
