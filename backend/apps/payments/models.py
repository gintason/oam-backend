"""
Cross-cutting money-movement records.

ServiceTransaction is the domain-level record for ANY paid service (funding
now; bills, remittance, bookings later) — it carries status, references, and
links to the immutable ledger journal once money posts.

WebhookEvent is the audit + dedupe store for every inbound provider callback.
Its raw_payload is written once and never edited; only the processing `status`
transitions.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel


class ServiceTransaction(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        REVERSED = "reversed", _("Reversed")

    class Service(models.TextChoices):
        WALLET_FUND = "wallet_fund", _("Wallet funding")
        WALLET_WITHDRAW = "wallet_withdraw", _("Wallet withdrawal")
        BILL = "bill", _("Bill payment")
        # more services register here as we build them

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                             related_name="service_transactions")
    service_type = models.CharField(max_length=24, choices=Service.choices)
    provider = models.CharField(max_length=40)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    amount = models.DecimalField(max_digits=20, decimal_places=4)
    fee = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    currency = models.CharField(max_length=3)

    internal_reference = models.CharField(max_length=80, unique=True)
    provider_reference = models.CharField(max_length=160, null=True, blank=True, db_index=True)
    idempotency_key = models.CharField(max_length=160, unique=True, null=True, blank=True)

    wallet = models.ForeignKey("wallet.Wallet", null=True, blank=True,
                               on_delete=models.SET_NULL, related_name="funding_transactions")
    journal = models.ForeignKey("wallet.JournalEntry", null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="+")

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "service_type", "status"]),
            models.Index(fields=["provider", "provider_reference"]),
        ]

    def __str__(self):
        return f"{self.service_type} {self.amount} {self.currency} [{self.status}]"


class WebhookEvent(TimeStampedModel):
    class Status(models.TextChoices):
        RECEIVED = "received", _("Received")
        PROCESSED = "processed", _("Processed")
        FAILED = "failed", _("Failed")
        IGNORED = "ignored", _("Ignored")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=40)
    event_type = models.CharField(max_length=80)
    external_id = models.CharField(max_length=200)      # dedupe key
    signature_valid = models.BooleanField(default=False)
    raw_payload = models.JSONField(default=dict)         # write-once by convention
    headers = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RECEIVED)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["provider", "external_id"], name="uniq_provider_event"),
        ]

    def __str__(self):
        return f"{self.provider}:{self.event_type} [{self.status}]"
