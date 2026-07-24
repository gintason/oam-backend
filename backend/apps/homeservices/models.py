"""
Home services: an artisan directory with proximity search.

Directory-only model: a customer finds nearby artisans (mechanic, plumber, ...)
and contacts them directly (phone/WhatsApp). Listing is free; artisans can pay
(via Paystack) to BOOST their profile — featured placement for a period.

Proximity uses stored lat/lng + Haversine (works on SQLite today; swap to
PostGIS after the Postgres migration without changing the API).
"""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel

# boost packages: days -> price (NGN). Change freely.
BOOST_PACKAGES = {30: Decimal("2500"), 90: Decimal("5000")}
# tier name -> days, so the API can speak in tiers rather than raw durations
BOOST_TIERS = {"premium": 30, "pro": 90}

DEFAULT_BOOST_DAYS = 30


class ServiceCategory(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90, unique=True)
    icon = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "service categories"

    def __str__(self):
        return self.name


class ArtisanProfile(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="artisan_profile")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT,
                                 related_name="artisans")
    business_name = models.CharField(max_length=140)
    description = models.TextField(blank=True)

    phone = models.CharField(max_length=32)
    whatsapp = models.CharField(max_length=32, blank=True)
    profile_photo = models.URLField(max_length=500, blank=True)

    address = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80, blank=True)
    state = models.CharField(max_length=80, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    years_experience = models.PositiveIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)     # admin-granted badge
    is_featured = models.BooleanField(default=False)     # boosted
    featured_until = models.DateTimeField(null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    @property
    def is_currently_featured(self):
        return bool(self.is_featured and self.featured_until and
                    self.featured_until > timezone.now())

    @property
    def has_location(self):
        return self.latitude is not None and self.longitude is not None

    def __str__(self):
        return f"{self.business_name} ({self.category})"


class BoostPayment(TimeStampedModel):
    """A Paystack-paid profile boost (pending -> paid)."""
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID = "paid", _("Paid")
        FAILED = "failed", _("Failed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="boost_payments")
    days = models.PositiveIntegerField(default=DEFAULT_BOOST_DAYS)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    reference = models.CharField(max_length=80, unique=True)
    provider = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    authorization_url = models.URLField(max_length=600, blank=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} boost {self.days}d {self.amount} [{self.status}]"

# Registered last: verification.py imports ArtisanProfile from this module,
# so the models above must exist before it is loaded.
from .verification import (  # noqa: E402,F401
    ArtisanServiceImage,
    ArtisanVerification,
)
