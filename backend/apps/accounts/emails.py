"""
Email delivery for OTPs and account notices.

Uses Django's email backend, so the transport is a settings concern: Gmail SMTP
today, SendGrid/Resend later, with no code change here. Sends a plain-text body
plus an HTML alternative (a bare code in plain text often trips spam filters).

Failures are logged and surfaced as a return value — never raised — so a mail
outage can't break signup. The user can always hit "resend OTP".
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger("accounts")

APP_NAME = getattr(settings, "APP_DISPLAY_NAME", "OAM Platform")

# Human-readable purpose -> subject line + intro copy
_PURPOSE_COPY = {
    "signup": ("Verify your email", "Use the code below to finish setting up your account."),
    "login": ("Your sign-in code", "Use the code below to sign in."),
    "password_reset": ("Reset your password", "Use the code below to reset your password."),
}


def _copy_for(purpose: str) -> tuple[str, str]:
    return _PURPOSE_COPY.get(purpose, ("Your verification code",
                                       "Use the code below to continue."))


def send_otp_email(*, destination: str, code: str, purpose: str, ttl_minutes: int) -> bool:
    """Send an OTP code by email. Returns True on success, False on failure."""
    subject_tail, intro = _copy_for(purpose)
    subject = f"{code} is your {APP_NAME} code — {subject_tail}"

    text_body = (
        f"{intro}\n\n"
        f"Your {APP_NAME} verification code is: {code}\n\n"
        f"This code expires in {ttl_minutes} minutes.\n"
        f"If you didn't request this, you can safely ignore this email — "
        f"someone may have typed your address by mistake.\n\n"
        f"— {APP_NAME}"
    )

    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border-radius:12px;
                      padding:32px;border:1px solid #e5e7eb;">
          <tr><td>
            <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">{APP_NAME}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.5;">
              {intro}
            </p>
            <div style="text-align:center;background:#f9fafb;border:1px solid #e5e7eb;
                        border-radius:10px;padding:20px;margin-bottom:24px;">
              <div style="font-size:32px;font-weight:700;letter-spacing:8px;
                          color:#111827;font-family:monospace;">{code}</div>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
              This code expires in <strong>{ttl_minutes} minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
              Didn't request this? You can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[destination],
        )
        message.attach_alternative(html_body, "text/html")
        sent = message.send(fail_silently=False)
    except Exception as exc:                       # SMTP down, bad creds, etc.
        logger.error("OTP email to %s failed: %s", destination, exc)
        return False

    if not sent:
        logger.error("OTP email to %s reported 0 sent", destination)
        return False

    logger.info("OTP email sent to %s (purpose=%s)", destination, purpose)
    return True
