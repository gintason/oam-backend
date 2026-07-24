"""
Purchase receipts by email — and, for prepaid electricity, the token itself.

WHY THIS EXISTS
  A token that lives only inside the app is a token the customer can lose. On
  live orders the sequence was: pay, wait, token arrives minutes later, and if
  they'd closed the tab they had nothing. Email lands somewhere people already
  look and keeps working when the app doesn't.

WHEN IT SENDS
  A post_save signal on BillOrder, so every path converges here — an order that
  completes instantly, one settled by the customer-facing refresh endpoint, and
  one picked up by the settle_bill_orders sweeper. No caller has to remember.

  For PREPAID ELECTRICITY it deliberately WAITS for the token. Sending "your
  purchase succeeded" without the digits is the email equivalent of the bug we
  just fixed. If the token never arrives, the sweeper's later save fires the
  signal again and the receipt goes out then.

SENT ONCE
  An OrderReceipt row records what went out. Re-polling, refreshing and the
  sweeper all re-save the order repeatedly; none of them will email twice.

NEVER BREAKS A PURCHASE
  Mail is sent on transaction commit, and failures are logged, never raised.
  A dead SMTP server must not roll back a delivered order.
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.common.models import TimeStampedModel

from .models import BillOrder

logger = logging.getLogger("billing")

APP_NAME = getattr(settings, "APP_DISPLAY_NAME", "OAM Platform")

BRAND_BLACK = "#0a0a0a"
BRAND_RED = "#E31012"
BRAND_GREEN = "#0B7327"


class OrderReceipt(TimeStampedModel):
    """One row per receipt actually sent — the guard against duplicates."""

    order = models.OneToOneField(
        BillOrder, on_delete=models.CASCADE, related_name="receipt"
    )
    destination = models.EmailField()
    kind = models.CharField(max_length=16)          # "success" | "failed"
    included_token = models.BooleanField(default=False)

    def __str__(self):
        return f"receipt {self.kind} -> {self.destination}"


# --------------------------------------------------------------------------- #
# Copy
# --------------------------------------------------------------------------- #

CATEGORY_LABEL = {
    "airtime": "Airtime",
    "data": "Data bundle",
    "electricity": "Electricity",
    "cable": "TV subscription",
}


def _money(amount, currency="NGN") -> str:
    symbol = {"NGN": "₦", "USD": "$", "GBP": "£", "EUR": "€"}.get(currency, "")
    return f"{symbol}{float(amount):,.2f}"


def _grouped(token: str) -> str:
    """Meter tokens are 20 digits; in groups of four they're far easier to type."""
    digits = "".join(ch for ch in str(token) if ch.isdigit())
    if len(digits) < 8:
        return str(token)
    return " ".join(digits[i:i + 4] for i in range(0, len(digits), 4))


def _provider_name(order: BillOrder) -> str:
    """
    The provider's display name.

    BillOrder exposes `biller_name` through its serializer, but the model itself
    stores the relation — so read it defensively rather than assuming a shape.
    """
    biller = getattr(order, "biller", None)
    if biller is not None:
        name = getattr(biller, "name", None)
        if name:
            return str(name)
    for attr in ("biller_name", "provider_name", "service_name"):
        value = getattr(order, attr, None)
        if value:
            return str(value)
    return str(getattr(order, "code", "") or "")


def _rows(order: BillOrder) -> list[tuple[str, str]]:
    rows = [("Service", CATEGORY_LABEL.get(order.category, order.category.title()))]
    provider = _provider_name(order)
    if provider:
        rows.append(("Provider", provider))
    if getattr(order, "customer_name", ""):
        rows.append(("Customer", order.customer_name))
    rows.append(("Recipient", str(getattr(order, "recipient", "") or "")))
    if getattr(order, "meter_type", ""):
        rows.append(("Meter type", order.meter_type.title()))
    rows.append(("Amount", _money(order.amount, order.currency)))
    if getattr(order, "units", ""):
        rows.append(("Units", str(order.units)))
    rows.append(("Paid with", "Card" if _from_card(order) else "Wallet"))
    rows.append(("Reference", order.reference))
    rows.append(("Date", order.created_at.strftime("%d %b %Y, %I:%M %p")))
    return rows


def _from_card(order: BillOrder) -> bool:
    """A card checkout funds the wallet first, so pay_with alone reads as 'wallet'."""
    try:
        return order.card_checkout.exists()
    except Exception:                                   # noqa: BLE001
        return False


# --------------------------------------------------------------------------- #
# Rendering
# --------------------------------------------------------------------------- #

def _text_body(order: BillOrder, ok: bool) -> str:
    lines = []
    if ok:
        lines.append(f"Your {CATEGORY_LABEL.get(order.category, 'purchase')} was successful.")
    else:
        lines.append("This purchase could not be completed.")
        lines.append(f"{_money(order.amount, order.currency)} is back in your {APP_NAME} wallet.")
    lines.append("")

    if ok and order.token:
        lines.append("YOUR RECHARGE TOKEN")
        lines.append(_grouped(order.token))
        lines.append("Type this into your meter keypad.")
        lines.append("")

    for label, value in _rows(order):
        lines.append(f"{label}: {value}")

    lines.append("")
    lines.append(f"— {APP_NAME}")
    return "\n".join(lines)


def _html_body(order: BillOrder, ok: bool) -> str:
    accent = BRAND_GREEN if ok else BRAND_RED
    heading = "Purchase successful" if ok else "Purchase not completed"
    intro = (
        f"Your {CATEGORY_LABEL.get(order.category, 'purchase').lower()} went through."
        if ok else
        f"We couldn't complete this purchase. {_money(order.amount, order.currency)} "
        f"is back in your {APP_NAME} wallet — nothing was lost."
    )

    token_block = ""
    if ok and order.token:
        units = (f'<p style="margin:10px 0 0;font-size:13px;color:#4b5563;">'
                 f'Units: <strong>{order.units}</strong></p>') if order.units else ""
        token_block = f"""
            <div style="text-align:center;background:#f0fdf4;border:1px solid {BRAND_GREEN}33;
                        border-radius:12px;padding:22px;margin:0 0 24px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1px;
                        color:{BRAND_GREEN};text-transform:uppercase;">Your recharge token</p>
              <div style="font-size:23px;font-weight:700;letter-spacing:2px;color:{BRAND_BLACK};
                          font-family:'SFMono-Regular',Consolas,monospace;word-break:break-all;">
                {_grouped(order.token)}
              </div>
              <p style="margin:12px 0 0;font-size:13px;color:#4b5563;">
                Type this into your meter keypad.
              </p>
              {units}
            </div>"""

    rows_html = "".join(
        f"""<tr>
              <td style="padding:7px 0;font-size:13px;color:#6b7280;">{label}</td>
              <td style="padding:7px 0;font-size:13px;color:#111827;text-align:right;
                         font-weight:500;">{value}</td>
            </tr>"""
        for label, value in _rows(order)
    )

    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;
                      border:1px solid #e5e7eb;">
          <tr><td style="height:4px;background:linear-gradient(90deg,{BRAND_BLACK} 33%,
                          {BRAND_RED} 33%,{BRAND_RED} 66%,{BRAND_GREEN} 66%);"></td></tr>
          <tr><td style="padding:30px;">
            <h1 style="margin:0 0 4px;font-size:19px;color:{BRAND_BLACK};">{APP_NAME}</h1>
            <p style="margin:0 0 18px;font-size:15px;font-weight:600;color:{accent};">{heading}</p>
            <p style="margin:0 0 22px;font-size:14px;color:#4b5563;line-height:1.55;">{intro}</p>
            {token_block}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="border-top:1px solid #e5e7eb;">{rows_html}</table>
            <p style="margin:22px 0 0;font-size:12px;color:#9ca3af;line-height:1.55;">
              Keep this email — your token stays valid and is also saved in your
              order history inside {APP_NAME}.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


# --------------------------------------------------------------------------- #
# Sending
# --------------------------------------------------------------------------- #

def send_order_receipt(order: BillOrder) -> bool:
    """Email a receipt for a settled order. Returns True on success."""
    destination = (getattr(order.user, "email", "") or "").strip()
    if not destination:
        logger.info("order %s: no email on account, skipping receipt", order.reference)
        return False

    ok = str(order.status).lower() == "success"
    label = CATEGORY_LABEL.get(order.category, "Purchase")

    if ok and order.token:
        subject = f"Your {label.lower()} token — {_money(order.amount, order.currency)}"
    elif ok:
        subject = f"{label} successful — {_money(order.amount, order.currency)}"
    else:
        subject = f"{label} not completed — {_money(order.amount, order.currency)} returned"

    try:
        text_body = _text_body(order, ok)
        html_body = _html_body(order, ok)
    except Exception as exc:                            # noqa: BLE001
        logger.error("receipt render for %s failed: %s", order.reference, exc)
        return False

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=[destination],
        )
        message.attach_alternative(html_body, "text/html")
        sent = message.send(fail_silently=False)
    except Exception as exc:                            # noqa: BLE001
        logger.error("receipt for %s to %s failed: %s", order.reference, destination, exc)
        return False

    if not sent:
        logger.error("receipt for %s reported 0 sent", order.reference)
        return False

    OrderReceipt.objects.update_or_create(
        order=order,
        defaults={
            "destination": destination,
            "kind": "success" if ok else "failed",
            "included_token": bool(order.token),
        },
    )
    logger.info("receipt sent for %s to %s", order.reference, destination)
    return True


def _should_send(order: BillOrder) -> bool:
    state = str(order.status).lower()
    if state not in ("success", "failed"):
        return False                                    # still in flight

    # Prepaid electricity: the token IS the product. Wait for it rather than
    # sending a receipt the customer can't act on. A later save (refresh or
    # sweeper) re-fires this signal once the token lands.
    if (state == "success"
            and order.category == "electricity"
            and (order.meter_type or "").lower() != "postpaid"
            and not order.token):
        return False

    return not OrderReceipt.objects.filter(order=order).exists()


@receiver(post_save, sender=BillOrder, dispatch_uid="billing_order_receipt")
def _on_order_saved(sender, instance: BillOrder, **kwargs):
    if not _should_send(instance):
        return

    # Send after the surrounding transaction commits: the order must be durable
    # before we tell anyone about it, and SMTP must never hold a DB lock.
    transaction.on_commit(lambda: send_order_receipt(instance))
