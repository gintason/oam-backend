"""
Delivery & Dispatch — data model.

    RiderProfile ──< RiderDocument            rider onboarding + verification
    DeliveryZone ──< SurgePricing             pricing rules (admin-managed)
    DispatchSettings (singleton)              commission, radius, offer timeout…
    DeliveryRequest ──< DeliveryEvent         the job + its status timeline
                    ──< DispatchOffer         which riders were offered it
                    ─── DeliveryTransaction   money: hold → rider payout + platform fee

Money is never stored as floats; coordinates are Decimal(9,6) (~11 cm).
"""
from __future__ import annotations

import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel

MONEY = {"max_digits": 14, "decimal_places": 2}
COORD = {"max_digits": 9, "decimal_places": 6}
FACTOR = {"max_digits": 5, "decimal_places": 2}


def _reference() -> str:
    return "DLV-" + secrets.token_hex(4).upper()


def _code() -> str:
    return f"{secrets.randbelow(10_000):04d}"


# --------------------------------------------------------------------------- #
# Riders
# --------------------------------------------------------------------------- #

class VehicleType(models.TextChoices):
    BICYCLE = "bicycle", _("Bicycle")
    MOTORCYCLE = "motorcycle", _("Motorcycle")
    CAR = "car", _("Car")
    VAN = "van", _("Van")


class RiderProfile(TimeStampedModel):
    class Verification(models.TextChoices):
        PENDING = "pending", _("Pending review")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")
        SUSPENDED = "suspended", _("Suspended")

    class Availability(models.TextChoices):
        ONLINE = "online", _("Online")
        OFFLINE = "offline", _("Offline")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="rider_profile")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=80, blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    vehicle_type = models.CharField(max_length=12, choices=VehicleType.choices,
                                    default=VehicleType.MOTORCYCLE)
    vehicle_plate = models.CharField(max_length=20, blank=True)
    vehicle_description = models.CharField(max_length=80, blank=True, help_text=_("e.g. Red Bajaj Boxer"))

    verification_status = models.CharField(max_length=10, choices=Verification.choices,
                                           default=Verification.PENDING, db_index=True)
    review_note = models.CharField(max_length=300, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name="+")

    availability = models.CharField(max_length=8, choices=Availability.choices,
                                    default=Availability.OFFLINE, db_index=True)
    lat = models.DecimalField(**COORD, null=True, blank=True)
    lng = models.DecimalField(**COORD, null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)

    # Where the rider's 80% goes (apps.payouts — verified with the bank, Paystack recipient).
    payout_account = models.ForeignKey("payouts.BankAccount", on_delete=models.SET_NULL, null=True,
                                       blank=True, related_name="+")
    auto_payout = models.BooleanField(default=True, help_text=_("Send each delivery's earnings to the bank."))
    cash_commission_due = models.DecimalField(**MONEY, default=Decimal("0"),
                                              help_text=_("OAM's share of cash deliveries not yet remitted."))

    total_earnings = models.DecimalField(**MONEY, default=Decimal("0"))
    completed_deliveries = models.PositiveIntegerField(default=0)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0"))
    rating_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["verification_status", "availability"], name="dlv_rider_avail_idx")]

    def __str__(self):
        return f"{self.full_name} ({self.get_verification_status_display()})"

    @property
    def is_dispatchable(self) -> bool:
        return (self.verification_status == self.Verification.APPROVED
                and self.availability == self.Availability.ONLINE)


class RiderDocument(TimeStampedModel):
    class Kind(models.TextChoices):
        ID_CARD = "id_card", _("Government ID")
        LICENSE = "license", _("Driver's / rider's licence")
        VEHICLE = "vehicle", _("Vehicle papers")
        SELFIE = "selfie", _("Selfie with ID")
        OTHER = "other", _("Other")

    rider = models.ForeignKey(RiderProfile, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    url = models.URLField(max_length=500)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["created_at"]


# --------------------------------------------------------------------------- #
# Pricing configuration
# --------------------------------------------------------------------------- #

class DispatchSettings(models.Model):
    """Singleton (pk=1) — global knobs, editable by admins in the dashboard."""
    commission_rate = models.DecimalField(max_digits=4, decimal_places=3, default=Decimal("0.200"),
                                          validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("0.9"))],
                                          help_text=_("Platform share of each fee (0.2 = 20%)."))
    default_base_fare = models.DecimalField(**MONEY, default=Decimal("800"))
    default_per_km = models.DecimalField(**MONEY, default=Decimal("150"))
    default_per_kg = models.DecimalField(**MONEY, default=Decimal("100"))
    default_min_fare = models.DecimalField(**MONEY, default=Decimal("1200"))
    free_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("5"))
    road_factor = models.DecimalField(**FACTOR, default=Decimal("1.30"),
                                      help_text=_("Road distance ≈ straight line × this."))
    round_to = models.PositiveIntegerField(default=50, help_text=_("Round fees up to this many naira."))

    auto_surge_enabled = models.BooleanField(default=True)
    max_surge = models.DecimalField(**FACTOR, default=Decimal("2.50"))

    search_radius_km = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("5.0"))
    radius_step_km = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("5.0"))
    max_rounds = models.PositiveSmallIntegerField(default=4)
    offer_batch = models.PositiveSmallIntegerField(default=3, help_text=_("Riders offered at once."))
    offer_timeout_s = models.PositiveSmallIntegerField(default=45)
    location_fresh_min = models.PositiveSmallIntegerField(default=10,
                                                          help_text=_("Ignore riders whose last location is older."))

    # Cash deliveries: the customer pays the rider; the rider remits OAM's share.
    cash_enabled = models.BooleanField(default=True)
    cash_debt_limit = models.DecimalField(**MONEY, default=Decimal("10000"),
                                          help_text=_("Riders owing more than this get no cash jobs."))
    oam_bank_name = models.CharField(max_length=80, blank=True)
    oam_account_number = models.CharField(max_length=20, blank=True)
    oam_account_name = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = verbose_name_plural = "Dispatch settings"

    @classmethod
    def load(cls) -> "DispatchSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class DeliveryZone(TimeStampedModel):
    """A circular service area with its own fares (smallest matching zone wins)."""
    name = models.CharField(max_length=80)
    city = models.CharField(max_length=80, blank=True)
    center_lat = models.DecimalField(**COORD)
    center_lng = models.DecimalField(**COORD)
    radius_km = models.DecimalField(max_digits=6, decimal_places=2)
    base_fare = models.DecimalField(**MONEY)
    per_km = models.DecimalField(**MONEY)
    per_kg = models.DecimalField(**MONEY, default=Decimal("100"))
    min_fare = models.DecimalField(**MONEY)
    zone_multiplier = models.DecimalField(**FACTOR, default=Decimal("1.00"))
    currency = models.CharField(max_length=3, default="NGN")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.radius_km} km)"


class SurgePricing(TimeStampedModel):
    """A manual surge window. zone=None applies everywhere."""
    zone = models.ForeignKey(DeliveryZone, on_delete=models.CASCADE, null=True, blank=True,
                             related_name="surges")
    multiplier = models.DecimalField(**FACTOR, validators=[MinValueValidator(Decimal("1.00"))])
    reason = models.CharField(max_length=120, blank=True, help_text=_("e.g. Rain, Friday rush"))
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-starts_at"]

    def __str__(self):
        return f"×{self.multiplier} {self.reason or ''}".strip()


# --------------------------------------------------------------------------- #
# Deliveries
# --------------------------------------------------------------------------- #

class PackageCategory(models.TextChoices):
    DOCUMENTS = "documents", _("Documents")
    SMALL = "small", _("Small parcel")
    MEDIUM = "medium", _("Medium parcel")
    LARGE = "large", _("Large item")
    FOOD = "food", _("Food")
    FRAGILE = "fragile", _("Fragile")


class DeliveryStatus(models.TextChoices):
    PENDING = "pending", _("Finding a rider")
    ACCEPTED = "accepted", _("Rider on the way to pickup")
    PICKED_UP = "picked_up", _("Picked up")
    IN_TRANSIT = "in_transit", _("On the way")
    DELIVERED = "delivered", _("Delivered")
    CANCELLED = "cancelled", _("Cancelled")


ACTIVE_STATUSES = (DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT)
# Payment states that let a delivery be dispatched (paid & held, or cash to the rider).
DISPATCHABLE_PAYMENT = ("paid", "cash", "due")


class DeliveryRequest(TimeStampedModel):
    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", _("Awaiting payment")
        PAID = "paid", _("Paid (held)")
        SETTLED = "settled", _("Settled")
        REFUNDED = "refunded", _("Refunded")
        CASH = "cash", _("Cash on delivery")
        DUE = "due", _("Pay on delivery")

    class PaymentMethod(models.TextChoices):
        WALLET = "wallet", _("OAM wallet")
        CARD = "card", _("Card / bank (Flutterwave)")
        CASH = "cash", _("Cash at pickup")
        ON_DELIVERY = "on_delivery", _("Pay on delivery (card, transfer or cash)")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=16, unique=True, default=_reference, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                 related_name="delivery_requests")

    pickup_address = models.CharField(max_length=255)
    pickup_lat = models.DecimalField(**COORD)
    pickup_lng = models.DecimalField(**COORD)
    pickup_contact_name = models.CharField(max_length=120, blank=True)
    pickup_contact_phone = models.CharField(max_length=20, blank=True)
    pickup_note = models.CharField(max_length=255, blank=True)

    dropoff_address = models.CharField(max_length=255)
    dropoff_lat = models.DecimalField(**COORD)
    dropoff_lng = models.DecimalField(**COORD)
    recipient_name = models.CharField(max_length=120)
    recipient_phone = models.CharField(max_length=20)
    dropoff_note = models.CharField(max_length=255, blank=True)

    package_description = models.CharField(max_length=255)
    package_category = models.CharField(max_length=10, choices=PackageCategory.choices,
                                        default=PackageCategory.SMALL)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1"))

    # Quote (frozen at creation)
    distance_km = models.DecimalField(max_digits=7, decimal_places=2)
    duration_min = models.PositiveIntegerField(default=0)
    zone = models.ForeignKey(DeliveryZone, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="deliveries")
    base_fare = models.DecimalField(**MONEY)
    distance_fare = models.DecimalField(**MONEY)
    weight_fare = models.DecimalField(**MONEY, default=Decimal("0"))
    zone_multiplier = models.DecimalField(**FACTOR, default=Decimal("1"))
    category_multiplier = models.DecimalField(**FACTOR, default=Decimal("1"))
    surge_multiplier = models.DecimalField(**FACTOR, default=Decimal("1"))
    fee = models.DecimalField(**MONEY)
    rider_payout = models.DecimalField(**MONEY)
    platform_fee = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, default="NGN")

    status = models.CharField(max_length=10, choices=DeliveryStatus.choices,
                              default=DeliveryStatus.PENDING, db_index=True)
    payment_status = models.CharField(max_length=8, choices=PaymentStatus.choices,
                                      default=PaymentStatus.UNPAID, db_index=True)
    payment_method = models.CharField(max_length=12, choices=PaymentMethod.choices,
                                      default=PaymentMethod.WALLET)
    payment_reference = models.CharField(max_length=40, blank=True, db_index=True,
                                         help_text=_("Card checkout reference (tx_ref)."))
    payment_url = models.URLField(max_length=500, blank=True)
    payment_provider = models.CharField(max_length=20, blank=True)
    rider = models.ForeignKey(RiderProfile, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="deliveries")

    delivery_code = models.CharField(max_length=4, default=_code,
                                     help_text=_("Given to the recipient; the rider enters it to complete."))
    proof_photo_url = models.URLField(max_length=500, blank=True)

    dispatch_round = models.PositiveSmallIntegerField(default=0)
    dispatch_exhausted = models.BooleanField(default=False,
                                             help_text=_("No rider accepted after all rounds."))

    accepted_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    in_transit_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)
    cancelled_by = models.CharField(max_length=10, blank=True)   # customer | rider | admin | system

    rating = models.PositiveSmallIntegerField(null=True, blank=True,
                                              validators=[MinValueValidator(1), MaxValueValidator(5)])
    review = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "payment_status"], name="dlv_status_pay_idx"),
                   models.Index(fields=["customer", "-created_at"], name="dlv_customer_idx")]

    def __str__(self):
        return f"{self.reference} · {self.get_status_display()}"

    @property
    def is_active(self) -> bool:
        return self.status in ACTIVE_STATUSES


class DeliveryEvent(models.Model):
    """Timeline entry — one per status change (plus notes)."""
    delivery = models.ForeignKey(DeliveryRequest, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=10, choices=DeliveryStatus.choices)
    note = models.CharField(max_length=255, blank=True)
    actor = models.CharField(max_length=10, blank=True)       # customer | rider | admin | system
    lat = models.DecimalField(**COORD, null=True, blank=True)
    lng = models.DecimalField(**COORD, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["created_at"]


class DispatchOffer(models.Model):
    class Status(models.TextChoices):
        OFFERED = "offered", _("Offered")
        ACCEPTED = "accepted", _("Accepted")
        REJECTED = "rejected", _("Rejected")
        EXPIRED = "expired", _("Expired")
        WITHDRAWN = "withdrawn", _("Taken by another rider")

    delivery = models.ForeignKey(DeliveryRequest, on_delete=models.CASCADE, related_name="offers")
    rider = models.ForeignKey(RiderProfile, on_delete=models.CASCADE, related_name="offers")
    round = models.PositiveSmallIntegerField(default=1)
    distance_km = models.DecimalField(max_digits=7, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OFFERED, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["delivery", "rider"], name="dlv_offer_once")]


class DeliveryTransaction(TimeStampedModel):
    """The money for one delivery: held from the customer, then split or refunded."""
    class Status(models.TextChoices):
        HELD = "held", _("Held")
        SETTLED = "settled", _("Settled")
        REFUNDED = "refunded", _("Refunded")
        CASH_DUE = "cash_due", _("Cash collected — commission due")

    class Payout(models.TextChoices):
        NONE = "", _("—")
        WALLET = "wallet", _("Kept in OAM wallet")
        PROCESSING = "processing", _("Bank transfer processing")
        SENT = "sent", _("Sent to bank")
        FAILED = "failed", _("Transfer failed — in wallet")

    delivery = models.OneToOneField(DeliveryRequest, on_delete=models.CASCADE, related_name="transaction")
    rider = models.ForeignKey(RiderProfile, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="transactions")
    gross_amount = models.DecimalField(**MONEY)
    rider_payout = models.DecimalField(**MONEY)
    platform_fee = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, default="NGN")
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.HELD, db_index=True)
    ledger_reference = models.CharField(max_length=40)
    payout_status = models.CharField(max_length=10, choices=Payout.choices, default=Payout.NONE, blank=True)
    payout_reference = models.CharField(max_length=40, blank=True)
    commission_paid_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
