"""Marketplace: categories, listings (contact-seller model), and seller tiers.

- OAM MOTORS is a category flagged is_admin_only -> only staff can post there.
- Listings auto-expire after LISTING_TTL_DAYS unless renewed.
- Seller tiers (free/premium/pro) cap the number of active listings and unlock
  featured placement. Paid upgrades (which book fees to OAM revenue) are wired
  in the subscriptions chunk.
"""
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel

LISTING_TTL_DAYS = 30

# active-listing limit per tier (None = unlimited)
TIER_LIMITS = {"free": 3, "premium": 20, "pro": None}

# monthly subscription price per paid tier (NGN)
from decimal import Decimal  # noqa: E402
SUBSCRIPTION_PRICES = {"premium": Decimal("2500"), "pro": Decimal("5000")}
SUBSCRIPTION_DAYS = 30
# tiers that get featured/boosted placement
FEATURED_TIERS = {"premium", "pro"}


class Category(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=120, blank=True)          # icon name or URL
    is_admin_only = models.BooleanField(default=False)           # OAM MOTORS = True
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Listing(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        SOLD = "sold", _("Sold")
        INACTIVE = "inactive", _("Inactive")

    class Condition(models.TextChoices):
        NEW = "new", _("New")
        USED = "used", _("Used")
        REFURBISHED = "refurbished", _("Refurbished")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="listings")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="listings")

    title = models.CharField(max_length=140)
    description = models.TextField()
    price = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    negotiable = models.BooleanField(default=False)
    condition = models.CharField(max_length=12, choices=Condition.choices, blank=True)
    location = models.CharField(max_length=120, blank=True)      # e.g. "Lagos, Ikeja"

    contact_phone = models.CharField(max_length=32)
    contact_whatsapp = models.CharField(max_length=32, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    is_featured = models.BooleanField(default=False)

    # Trust/verification: listings go live immediately (status stays ACTIVE),
    # but an admin can verify a listing, which attaches a "verified" badge. Any
    # owner edit resets this so the badge always reflects reviewed content.
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )

    views_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["seller", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=LISTING_TTL_DAYS)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return self.expires_at is not None and self.expires_at <= timezone.now()

    @property
    def is_live(self):
        return self.status == self.Status.ACTIVE and not self.is_expired

    def __str__(self):
        return f"{self.title} ({self.category})"


class ListingImage(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    url = models.URLField(max_length=500)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "created_at"]


class ListingVideo(TimeStampedModel):
    """A short video clip attached to a listing (Cloudinary URL)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="videos")
    url = models.URLField(max_length=500)
    thumbnail_url = models.URLField(max_length=500, blank=True)  # optional poster frame

    class Meta:
        ordering = ["created_at"]


class SellerSubscription(TimeStampedModel):
    class Tier(models.TextChoices):
        FREE = "free", _("Free")
        PREMIUM = "premium", _("Premium")
        PRO = "pro", _("Pro")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="seller_subscription")
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.FREE)
    expires_at = models.DateTimeField(null=True, blank=True)   # null = free / no expiry

    @property
    def active_tier(self):
        if self.tier != self.Tier.FREE and self.expires_at and self.expires_at <= timezone.now():
            return self.Tier.FREE       # lapsed paid tier falls back to free
        return self.tier

    def listing_limit(self):
        return TIER_LIMITS.get(self.active_tier, TIER_LIMITS["free"])

    def __str__(self):
        return f"{self.user} · {self.tier}"


class SubscriptionPayment(TimeStampedModel):
    """A subscription payment via Paystack card checkout (pending -> paid)."""
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID = "paid", _("Paid")
        FAILED = "failed", _("Failed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="subscription_payments")
    tier = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    reference = models.CharField(max_length=80, unique=True)
    period_days = models.PositiveIntegerField(default=SUBSCRIPTION_DAYS)

    provider = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    authorization_url = models.URLField(max_length=600, blank=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.tier} {self.amount} {self.currency} [{self.status}]"

# Registered last: motors.py imports Listing/Category from this module,
# so those models must be defined before it is loaded.
from .motors import VehicleDetail  # noqa: E402,F401
