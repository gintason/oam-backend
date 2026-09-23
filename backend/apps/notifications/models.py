from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class DeviceToken(TimeStampedModel):
    """An Expo push token for one of a user's devices."""
    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        OTHER = "other", "Other"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="device_tokens")
    token = models.CharField(max_length=255, unique=True, db_index=True)
    platform = models.CharField(max_length=10, choices=Platform.choices, default=Platform.OTHER)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} · {self.platform} · {self.token[:16]}…"


class Notification(TimeStampedModel):
    """An in-app notification shown in the user's bell feed (e.g. money received)."""
    class Kind(models.TextChoices):
        WALLET_CREDIT = "wallet_credit", "Wallet credit"
        GENERAL = "general", "General"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="notifications")
    kind = models.CharField(max_length=32, choices=Kind.choices, default=Kind.GENERAL)
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self):
        return f"{self.user} · {self.title}"
