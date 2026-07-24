"""
Bill payment (VTU) models.

Biller  = a payable service (a network for airtime/data, a disco for
electricity, a TV provider for cable). Country-scoped so we can expand beyond
Nigeria later.

BillOrder = one purchase attempt, tracking the hold/capture/release lifecycle
against the wallet and the VTU provider.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel


class Biller(TimeStampedModel):
    class Category(models.TextChoices):
        AIRTIME = "airtime", _("Airtime")
        DATA = "data", _("Data")
        ELECTRICITY = "electricity", _("Electricity")
        CABLE = "cable", _("Cable TV")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country = models.CharField(max_length=2, default="NG")     # ISO-2; NG for now
    category = models.CharField(max_length=16, choices=Category.choices)
    code = models.CharField(max_length=40)                     # e.g. "MTN", "IKEDC", "DSTV"
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["country", "category", "code"],
                                    name="uniq_biller_country_category_code"),
        ]
        ordering = ["country", "category", "name"]

    def __str__(self):
        return f"{self.name} ({self.country}/{self.category})"


class BillOrder(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        REVERSED = "reversed", _("Reversed")

    class PayWith(models.TextChoices):
        WALLET = "wallet", _("Wallet")
        CARD = "card", _("Card")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                             related_name="bill_orders")
    biller = models.ForeignKey(Biller, on_delete=models.PROTECT, related_name="orders")
    category = models.CharField(max_length=16, choices=Biller.Category.choices)
    recipient = models.CharField(max_length=64)                # phone / meter / smartcard
    plan_code = models.CharField(max_length=64, blank=True)    # for data/cable bundles

    amount = models.DecimalField(max_digits=20, decimal_places=4)          # face value (user pays)
    cost_amount = models.DecimalField(max_digits=20, decimal_places=4, default=0)     # provider charge
    revenue_amount = models.DecimalField(max_digits=20, decimal_places=4, default=0)  # OAM margin
    currency = models.CharField(max_length=3, default="NGN")
    pay_with = models.CharField(max_length=8, choices=PayWith.choices, default=PayWith.WALLET)

    # cable / electricity extras
    customer_name = models.CharField(max_length=160, blank=True)   # from verify/purchase
    meter_type = models.CharField(max_length=16, blank=True)       # prepaid / postpaid
    token = models.CharField(max_length=64, blank=True)            # prepaid electricity token
    units = models.CharField(max_length=32, blank=True)            # electricity units

    wallet = models.ForeignKey("wallet.Wallet", null=True, blank=True,
                               on_delete=models.SET_NULL, related_name="bill_orders")
    reference = models.CharField(max_length=80, unique=True)
    provider = models.CharField(max_length=40, blank=True)
    provider_reference = models.CharField(max_length=160, null=True, blank=True, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["category", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.category} {self.amount} {self.currency} -> {self.recipient} [{self.status}]"


class CustomerVerification(TimeStampedModel):
    """
    A successful verify-customer result. A purchase for cable/electricity must
    reference a recent verification (so users always confirm the account name
    before paying).
    """
    FRESH_MINUTES = 30

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="verifications")
    service_id = models.CharField(max_length=40)          # dstv, ikeja-electric, ...
    customer_id = models.CharField(max_length=64)         # meter / smartcard
    variation = models.CharField(max_length=16, blank=True)   # prepaid/postpaid (electricity)
    customer_name = models.CharField(max_length=160)
    data = models.JSONField(default=dict, blank=True)     # full verify payload

    class Meta:
        indexes = [models.Index(fields=["user", "service_id", "customer_id"])]
        ordering = ["-created_at"]

    def is_fresh(self):
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() - self.created_at <= timedelta(minutes=self.FRESH_MINUTES)

    def __str__(self):
        return f"{self.service_id}:{self.customer_id} -> {self.customer_name}"

from .card import CardCheckout  # noqa: F401
from .receipts import OrderReceipt  # noqa: E402,F401