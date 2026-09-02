#!/usr/bin/env python3
"""
Expo push notifications for OAM.

Adds a new app `apps.notifications`:
  * DeviceToken model (one row per device push token, per user).
  * POST /api/v1/notifications/register-device/  {token, platform}
    POST /api/v1/notifications/unregister-device/ {token}
  * push.send_push_to_user(user, title, body, data) -> pushes to all of the
    user's active tokens via Expo's push API, and deactivates dead tokens.

Wires the referral earnings notification (ReferralService._notify) to also send
a push, so "You earned ₦X ..." reaches the device (the in-app record stays too).

Requires the referral app to already be installed. RUN FROM BACKEND ROOT:
    python3 push_patch/apply_push.py
    python manage.py migrate
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


def write(path, content):
    full = _p(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(content)
    print(f"  + wrote {path}")


def edit(path, subs):
    full = _p(path)
    if not os.path.exists(full):
        sys.exit(f"ABORT: expected file not found: {path}")
    s = open(full, encoding="utf-8").read()
    for old, new in subs:
        if new in s:
            print(f"  = {path}: already applied, skipping one edit")
            continue
        if s.count(old) != 1:
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:160]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


# ---------------------------------------------------------------- app files
write("apps/notifications/__init__.py", "")

write("apps/notifications/apps.py", '''from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
''')

write("apps/notifications/models.py", '''from django.conf import settings
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
''')

write("apps/notifications/push.py", '''"""
Send push notifications to a user's devices via Expo's push service.
Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import logging

import requests

from .models import DeviceToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_to_user(user, title, body, data=None):
    """Push `title`/`body` to every active token the user has. Best-effort."""
    tokens = list(
        DeviceToken.objects.filter(user=user, is_active=True)
        .values_list("token", flat=True)
    )
    if not tokens:
        return

    messages = [
        {"to": t, "title": title, "body": body, "sound": "default", "data": data or {}}
        for t in tokens
    ]
    try:
        resp = requests.post(
            EXPO_PUSH_URL, json=messages, timeout=10,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        payload = resp.json()
    except Exception as exc:  # network / parse issues are non-fatal
        logger.warning("Expo push failed: %s", exc)
        return

    # Deactivate tokens Expo reports as no longer registered.
    tickets = payload.get("data") or []
    dead = []
    for token, ticket in zip(tokens, tickets):
        if isinstance(ticket, dict) and ticket.get("status") == "error":
            details = ticket.get("details") or {}
            if details.get("error") == "DeviceNotRegistered":
                dead.append(token)
    if dead:
        DeviceToken.objects.filter(token__in=dead).update(is_active=False)
''')

write("apps/notifications/serializers.py", '''from rest_framework import serializers

from .models import DeviceToken


class RegisterDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(
        choices=[c[0] for c in DeviceToken.Platform.choices], default="other")
''')

write("apps/notifications/views.py", '''from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken
from .serializers import RegisterDeviceSerializer


class RegisterDeviceView(APIView):
    """POST /notifications/register-device/ {token, platform} — idempotent upsert."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = RegisterDeviceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data["token"]
        platform = s.validated_data["platform"]
        # A token belongs to whichever account most recently registered it.
        DeviceToken.objects.update_or_create(
            token=token,
            defaults={"user": request.user, "platform": platform, "is_active": True},
        )
        return Response({"ok": True})


class UnregisterDeviceView(APIView):
    """POST /notifications/unregister-device/ {token} — on logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        if token:
            DeviceToken.objects.filter(user=request.user, token=token).update(is_active=False)
        return Response({"ok": True})
''')

write("apps/notifications/urls.py", '''from django.urls import path

from .views import RegisterDeviceView, UnregisterDeviceView

urlpatterns = [
    path("register-device/", RegisterDeviceView.as_view(), name="register-device"),
    path("unregister-device/", UnregisterDeviceView.as_view(), name="unregister-device"),
]
''')

write("apps/notifications/admin.py", '''from django.contrib import admin

from .models import DeviceToken


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "is_active", "updated_at")
    list_filter = ("platform", "is_active")
    search_fields = ("user__email", "token")
''')

write("apps/notifications/migrations/__init__.py", "")

write("apps/notifications/migrations/0001_initial.py", '''from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DeviceToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("token", models.CharField(db_index=True, max_length=255, unique=True)),
                ("platform", models.CharField(choices=[("ios", "iOS"), ("android", "Android"), ("other", "Other")], default="other", max_length=10)),
                ("is_active", models.BooleanField(default=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="device_tokens", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
    ]
''')

# ------------------------------------------------------------------- wiring
edit("config/settings/base.py", [(
    '    "apps.referrals",       # user referral links + 10% commission engine',
    '    "apps.referrals",       # user referral links + 10% commission engine\n'
    '    "apps.notifications",   # device push tokens + Expo push sender',
)])

edit("config/urls.py", [(
    '    path("api/v1/referrals/", include("apps.referrals.urls")),',
    '    path("api/v1/referrals/", include("apps.referrals.urls")),\n'
    '    path("api/v1/notifications/", include("apps.notifications.urls")),',
)])

# wire the referral earnings notification to also push
edit("apps/referrals/services.py", [(
    '''    @staticmethod
    def _notify(referrer, amount, referee):
        """In-app notification. Push (Expo/FCM) can hook in here once device tokens exist."""
        try:
            ReferralNotification.objects.create(
                user=referrer,
                message=(f"You earned ₦{amount:,.2f} from a referral transaction "
                         f"by {referee.first_name or 'a referral'}!"),
            )
        except Exception:
            pass''',
    '''    @staticmethod
    def _notify(referrer, amount, referee):
        """In-app record + Expo push for referral earnings."""
        message = (f"You earned ₦{amount:,.2f} from a referral transaction "
                   f"by {referee.first_name or 'a referral'}!")
        try:
            ReferralNotification.objects.create(user=referrer, message=message)
        except Exception:
            pass
        try:
            from apps.notifications.push import send_push_to_user
            send_push_to_user(referrer, "You've got referral earnings 🎉", message,
                              {"type": "referral"})
        except Exception:
            pass''',
)])

print("\\nDONE. Push notifications installed. Now run:  python manage.py migrate")
