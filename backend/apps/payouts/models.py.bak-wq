"""
Withdrawals to real bank accounts (Paystack Transfers).

BankAccount    = a saved, verified payout destination (with the provider's
                 recipient_code once created).
WithdrawalOrder = one payout attempt, tracking the wallet hold -> transfer ->
                 capture/release lifecycle.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel


class BankAccount(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="bank_accounts")
    bank_code = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=120, blank=True)
    account_number = models.CharField(max_length=20)
    account_name = models.CharField(max_length=160)
    recipient_code = models.CharField(max_length=120, blank=True)   # provider recipient
    currency = models.CharField(max_length=3, default="NGN")
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "bank_code", "account_number"],
                                    name="uniq_user_bank_account"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.account_name} · {self.account_number} ({self.bank_code})"


class WithdrawalOrder(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        REVERSED = "reversed", _("Reversed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                             related_name="withdrawals")
    wallet = models.ForeignKey("wallet.Wallet", null=True, blank=True,
                               on_delete=models.SET_NULL, related_name="withdrawals")
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT,
                                     related_name="withdrawals")
    amount = models.DecimalField(max_digits=20, decimal_places=4)
    currency = models.CharField(max_length=3, default="NGN")

    reference = models.CharField(max_length=80, unique=True)
    provider = models.CharField(max_length=40, blank=True)
    provider_reference = models.CharField(max_length=160, null=True, blank=True, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    failure_reason = models.CharField(max_length=200, blank=True)

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=["user", "status"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"WD {self.amount} {self.currency} -> {self.bank_account_id} [{self.status}]"
