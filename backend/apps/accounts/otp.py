"""
OTP service — generation, delivery, and verification.

Delivery:
  * EMAIL -> a real message via Django's email backend (Gmail SMTP today; swap
    the backend in settings for SendGrid/Resend later, no change here).
  * PHONE -> still a dev stub until an SMS provider is chosen.

In DEBUG the code is ALSO printed to the runserver console, so local testing
never depends on an inbox. A send failure is logged and reported back to the
caller rather than raised — a mail outage must not break signup.
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .emails import send_otp_email
from .models import OTPCode

logger = logging.getLogger("accounts")

OTP_LENGTH = 6
OTP_TTL_MINUTES = 5           # per product decision
MAX_ATTEMPTS = 5              # wrong tries before a code is locked


def _generate_code() -> str:
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def issue_otp(user, *, purpose: str, channel: str, destination: str) -> OTPCode:
    # Invalidate any previous unused codes for this user+purpose.
    OTPCode.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

    code = _generate_code()
    otp = OTPCode.objects.create(
        user=user,
        purpose=purpose,
        channel=channel,
        destination=destination,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    delivered = _deliver(channel, destination, code, purpose)
    otp.delivered = delivered          # transient flag for the view (not persisted)
    return otp


def _deliver(channel: str, destination: str, code: str, purpose: str) -> bool:
    """Route the code to its channel. Returns True if handed off successfully."""
    delivered = False

    if channel == OTPCode.Channel.EMAIL:
        delivered = send_otp_email(
            destination=destination, code=code,
            purpose=purpose, ttl_minutes=OTP_TTL_MINUTES,
        )
    elif channel == OTPCode.Channel.PHONE:
        # TODO: wire an SMS provider (Termii / Twilio / Africa's Talking).
        logger.info("SMS OTP not yet wired; code for %s logged only.", destination)
    else:
        logger.warning("Unknown OTP channel: %s", channel)

    # Dev convenience: always surface the code locally so testing never
    # depends on an inbox (and so a failed send doesn't block you).
    if settings.DEBUG:
        banner = f"OAM OTP -> {destination} via {channel}: {code} (valid {OTP_TTL_MINUTES} min)"
        logger.info(banner)
        print(f"\n========== {banner} ==========\n")

    return delivered


def verify_otp(user, *, purpose: str, code: str) -> tuple[bool, str]:
    """Returns (ok, reason). reason is a short machine code for the client."""
    otp = (
        OTPCode.objects.filter(user=user, purpose=purpose, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if otp is None:
        return False, "no_active_code"
    if otp.is_expired:
        return False, "expired"
    if otp.attempts >= MAX_ATTEMPTS:
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return False, "too_many_attempts"
    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False, "invalid_code"

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True, "ok"
