"""
International airtime top-up persistence (Reloadly).

An AirtimeTopup is created at checkout (PENDING). After the customer's NGN
payment (wallet or Flutterwave) is confirmed, we call Reloadly; on success we
store the transaction and flip to SUCCESS, else refund and FAIL.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class AirtimeTopup(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        PAID = "paid", "Paid — sending"
        SUCCESS = "success", "Successful"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="airtime_topups")
    reference = models.CharField(max_length=40, unique=True, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    # what was ordered
    operator_id = models.CharField(max_length=32)
    operator_name = models.CharField(max_length=120, blank=True)
    country_iso = models.CharField(max_length=4, blank=True)
    recipient_number = models.CharField(max_length=32)
    recipient_iso2 = models.CharField(max_length=4)
    use_local_amount = models.BooleanField(default=False)

    # money: face value (in the operator/sender currency) + what the customer pays in NGN
    amount = models.DecimalField(max_digits=20, decimal_places=4, default=0)   # face value sent
    currency = models.CharField(max_length=6, default="USD")                   # sender currency
    total_ngn = models.DecimalField(max_digits=20, decimal_places=2, default=0)  # customer pays
    cost_ngn = models.DecimalField(max_digits=20, decimal_places=2, default=0)   # OAM's Reloadly cost (NGN est.)
    markup_ngn = models.DecimalField(max_digits=20, decimal_places=2, default=0) # OAM revenue

    # payment linkage (wallet reference or Flutterwave/funding reference)
    payment_reference = models.CharField(max_length=120, blank=True, db_index=True)
    pay_with = models.CharField(max_length=10, default="wallet")   # wallet | card

    # Reloadly result
    reloadly_transaction_id = models.CharField(max_length=64, blank=True, db_index=True)
    delivered_amount = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    delivered_currency = models.CharField(max_length=6, blank=True)

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Airtime {self.reference} · {self.operator_name} · {self.recipient_number} [{self.status}]"


class AirtimeApiLog(TimeStampedModel):
    topup = models.ForeignKey(AirtimeTopup, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="api_logs")
    endpoint = models.CharField(max_length=80)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    status_code = models.PositiveIntegerField(default=0)
    ok = models.BooleanField(default=False)
    error = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
