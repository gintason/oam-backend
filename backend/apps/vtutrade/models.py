"""
Gift card buy/sell and RMB purchases through VTU.ng's Partner API.

Switched off until VTU.ng approves O.A.M's KYB:
    VTU_GIFTCARDS_ENABLED=true / VTU_RMB_ENABLED=true

Money flow
  * gift card BUY / RMB: customer's wallet is HELD, VTU.ng is paid from O.A.M's
    VTU.ng wallet; completed -> capture, failed/refunded -> release.
  * gift card SELL: nothing is held. VTU.ng reviews the card; when approved it
    pays O.A.M's VTU.ng wallet and we CREDIT the customer's O.A.M wallet
    (VTU.ng payout minus O.A.M's margin).
"""
import uuid

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class TradeOrder(TimeStampedModel):
    class Kind(models.TextChoices):
        GIFTCARD_BUY = "giftcard_buy", "Gift card purchase"
        GIFTCARD_SELL = "giftcard_sell", "Gift card sale"
        RMB_BUY = "rmb_buy", "RMB purchase"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        PROCESSING = "processing", "Processing"
        SUCCESS = "success", "Successful"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Declined"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="trade_orders")
    wallet = models.ForeignKey("wallet.Wallet", on_delete=models.PROTECT, related_name="trade_orders")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    reference = models.CharField(max_length=40, unique=True)
    provider_reference = models.CharField(max_length=80, blank=True, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PROCESSING)
    currency = models.CharField(max_length=3, default="NGN")
    # BUY / RMB: what the customer pays. SELL: what the customer receives.
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    # What VTU.ng charges (buy/rmb) or pays (sell) in naira.
    provider_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    revenue_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    title = models.CharField(max_length=160, blank=True)            # e.g. "Amazon US $50 x1"
    details = models.JSONField(default=dict, blank=True)            # what the customer asked for
    codes = models.JSONField(default=list, blank=True)              # gift card codes once delivered
    failure_reason = models.CharField(max_length=255, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} {self.reference} ({self.status})"
