"""
Send email over an HTTPS API instead of SMTP.

Render's free instances block outgoing SMTP (ports 25/465/587), so SMTP sends
just time out there. This backend posts to the provider's API on port 443.
Every existing sender (OTP codes, receipts, notifications) keeps using Django's
normal email functions; only the transport changes.

Settings / env:
    EMAIL_API_PROVIDER   "resend" or "brevo"
    EMAIL_API_KEY        the provider's API key
    DEFAULT_FROM_EMAIL   e.g. "O.A.M <no-reply@oam-app.com>" (must be a verified
                         sender/domain at the provider)
"""
from __future__ import annotations

import base64
import logging
from email.utils import getaddresses, parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger("accounts")

RESEND_URL = "https://api.resend.com/emails"
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _addrs(values) -> list[tuple[str, str]]:
    return [(n, a) for n, a in getaddresses(list(values or [])) if a]


def _parts(msg) -> tuple[str, str]:
    """(text, html) bodies of an EmailMessage / EmailMultiAlternatives."""
    text, html = msg.body or "", ""
    if getattr(msg, "content_subtype", "plain") == "html":
        text, html = "", msg.body or ""
    for content, mimetype in getattr(msg, "alternatives", []) or []:
        if mimetype == "text/html":
            html = content
    return text, html


def _attachments(msg) -> list[tuple[str, str]]:
    out = []
    for att in msg.attachments or []:
        if isinstance(att, tuple):
            name, content = att[0], att[1]
        else:  # MIMEBase
            name, content = att.get_filename() or "attachment", att.get_payload(decode=True)
        if isinstance(content, str):
            content = content.encode()
        out.append((name or "attachment", base64.b64encode(content or b"").decode()))
    return out


class ApiEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.provider = (getattr(settings, "EMAIL_API_PROVIDER", "") or "").strip().lower()
        self.api_key = (getattr(settings, "EMAIL_API_KEY", "") or "").strip()
        self.timeout = getattr(settings, "EMAIL_TIMEOUT", 15) or 15

    def send_messages(self, email_messages):
        sent = 0
        for msg in email_messages or []:
            try:
                self._send(msg)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception("Email API send failed (%s)", self.provider)
        return sent

    def _send(self, msg):
        if not self.api_key or self.provider not in ("resend", "brevo"):
            raise RuntimeError("EMAIL_API_PROVIDER must be 'resend' or 'brevo' and EMAIL_API_KEY must be set.")
        from_name, from_addr = parseaddr(msg.from_email or settings.DEFAULT_FROM_EMAIL)
        to, cc, bcc = _addrs(msg.to), _addrs(msg.cc), _addrs(msg.bcc)
        reply_to = _addrs(msg.reply_to)
        text, html = _parts(msg)
        atts = _attachments(msg)

        if self.provider == "resend":
            fmt = lambda n, a: f"{n} <{a}>" if n else a  # noqa: E731
            body = {"from": fmt(from_name, from_addr), "to": [fmt(n, a) for n, a in to],
                    "subject": msg.subject or ""}
            if cc: body["cc"] = [fmt(n, a) for n, a in cc]
            if bcc: body["bcc"] = [fmt(n, a) for n, a in bcc]
            if reply_to: body["reply_to"] = [a for _, a in reply_to]
            if text: body["text"] = text
            if html: body["html"] = html
            if atts: body["attachments"] = [{"filename": n, "content": c} for n, c in atts]
            resp = requests.post(RESEND_URL, json=body, timeout=self.timeout,
                                 headers={"Authorization": f"Bearer {self.api_key}"})
        else:
            who = lambda n, a: {"email": a, **({"name": n} if n else {})}  # noqa: E731
            body = {"sender": who(from_name, from_addr), "to": [who(n, a) for n, a in to],
                    "subject": msg.subject or ""}
            if cc: body["cc"] = [who(n, a) for n, a in cc]
            if bcc: body["bcc"] = [who(n, a) for n, a in bcc]
            if reply_to: body["replyTo"] = who(*reply_to[0])
            if text: body["textContent"] = text
            if html: body["htmlContent"] = html
            if atts: body["attachment"] = [{"name": n, "content": c} for n, c in atts]
            resp = requests.post(BREVO_URL, json=body, timeout=self.timeout,
                                 headers={"api-key": self.api_key, "accept": "application/json"})

        if not (200 <= resp.status_code < 300):
            raise RuntimeError(f"{self.provider} rejected the email: HTTP {resp.status_code} {resp.text[:300]}")
