"""Transactional email for wallet notifications."""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)
APP_NAME = getattr(settings, "APP_NAME", "OAM")


def send_notification_email(*, user, title: str, body: str) -> bool:
    to = getattr(user, "email", "") or ""
    if not to:
        return False
    name = getattr(user, "first_name", "") or "there"
    subject = f"{title} — {APP_NAME}"
    text = f"Hi {name},\n\n{body}\n\n— {APP_NAME}"
    html = f"""\
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0B7327;margin:0 0 6px">{title}</h2>
      <p style="color:#333;font-size:15px;line-height:22px">Hi {name},</p>
      <p style="color:#333;font-size:15px;line-height:22px">{body}</p>
      <p style="color:#888;font-size:12px;margin-top:24px">You're receiving this because you have an {APP_NAME} wallet.</p>
    </div>"""
    try:
        msg = EmailMultiAlternatives(
            subject=subject, body=text,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None), to=[to])
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=True)
        return True
    except Exception:
        logger.exception("send_notification_email failed")
        return False
