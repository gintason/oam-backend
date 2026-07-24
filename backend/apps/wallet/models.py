"""
Double-entry ledger + multi-currency wallet.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import ImmutableModel, TimeStampedModel


class LedgerAccount(TimeStampedModel):
    """A single account in the chart of accounts (per currency)."""
    class Type(models.TextChoices):
        ASSET = "asset", _("Asset")
        LIABILITY = "liability", _("Liability")
        INCOME = "income", _("Income")
        EXPENSE = "expense", _("Expense")
        SUSPENSE = "suspense", _("Suspense")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=120, unique=True)
    name = models.CharField(max_length=160)
    type = models.CharField(max_length=12, choices=Type.choices)
    currency = models.CharField(max_length=3)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.PROTECT, related_name="ledger_accounts",
    )
    is_system = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["type", "currency"])]

    def __str__(self):
        return f"{self.code} ({self.currency})"


class JournalEntry(ImmutableModel):
    """An immutable envelope grouping the balanced postings of one event."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=80, unique=True)
    idempotency_key = models.CharField(max_length=160, unique=True, null=True, blank=True)
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    reverses = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="reversed_by",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.reference} ({self.currency})"


class LedgerPosting(ImmutableModel):
    """One immutable debit or credit line against an account."""
    class Direction(models.TextChoices):
        DEBIT = "debit", _("Debit")
        CREDIT = "credit", _("Credit")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(JournalEntry, on_delete=models.PROTECT, related_name="postings")
    account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name="postings")
    direction = models.CharField(max_length=6, choices=Direction.choices)
    amount = models.DecimalField(max_digits=20, decimal_places=4)
    currency = models.CharField(max_length=3)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(amount__gt=0), name="posting_amount_positive"),
        ]
        indexes = [models.Index(fields=["account", "created_at"])]

    def __str__(self):
        return f"{self.direction} {self.amount} {self.currency}"


class Wallet(TimeStampedModel):
    """A user's balance in ONE currency. A user may hold several (NGN/USD/GBP/EUR)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="wallets",
    )
    currency = models.CharField(max_length=3)
    account = models.OneToOneField(LedgerAccount, on_delete=models.PROTECT, related_name="wallet")
    cached_balance = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    version = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "currency"], name="uniq_user_currency_wallet"),
        ]

    def __str__(self):
        return f"{self.user} · {self.cached_balance} {self.currency}"

from .transfer import WalletTransfer  # noqa: E402,F401