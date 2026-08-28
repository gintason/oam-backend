from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class ReferralProfile(TimeStampedModel):
    """A user's referral identity: their customisable slug + unique code."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="referral_profile")
    custom_slug = models.SlugField(max_length=40)
    referral_code = models.CharField(max_length=16, unique=True, db_index=True)
    total_earnings = models.DecimalField(max_digits=20, decimal_places=2, default=0)   # NGN
    total_referrals_count = models.PositiveIntegerField(default=0)

    def link(self) -> str:
        return f"https://oam-app.com/refer-{self.custom_slug}-{self.referral_code}"

    def __str__(self):
        return f"{self.user} · {self.referral_code}"


class ReferralRelationship(TimeStampedModel):
    """Records that `referee` signed up through `referrer`."""
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"      # becomes ACTIVE once they earn a commission

    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="referrals_made")
    referee = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name="referred_by")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return f"{self.referrer} -> {self.referee} [{self.status}]"


class ReferralCommissionLog(TimeStampedModel):
    """Immutable record of a paid referral commission (one per source txn)."""
    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="referral_commissions")
    referee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="referral_commissions_generated")
    source_transaction_id = models.CharField(max_length=120, unique=True, db_index=True)
    oam_profit_amount = models.DecimalField(max_digits=20, decimal_places=2)   # NGN
    commission_amount = models.DecimalField(max_digits=20, decimal_places=2)   # NGN

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.referrer} +{self.commission_amount} ({self.source_transaction_id})"


class ReferralNotification(TimeStampedModel):
    """Lightweight in-app notification (surfaced by the dashboard endpoint)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="referral_notifications")
    message = models.CharField(max_length=255)
    seen = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
