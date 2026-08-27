#!/usr/bin/env python3
"""
Harden the Flutterwave payment-initialisation payload so the hosted checkout
stops crashing on "Pay" (TypeError: Cannot read properties of undefined
(reading 'switch') in card-payment.vue).

Root cause: the payload we POST to /v3/payments was missing `payment_options`
and sent an incomplete `customer` (email only). Flutterwave's card component
then hits an undefined config branch and throws.

This patch:
  1. Rewrites integrations/payments/flutterwave/adapter.py so initialize_charge
     sends a strict, non-null payload:
       - payment_options: "card"        (never null/empty)
       - customer: { email, name, phonenumber? }   (name/phone from metadata,
         safe fallbacks so nothing is null)
       - customizations: { title, description }
       - redirect_url only when configured (never empty)
       - amount as string, currency upper-cased and non-null
     tx_ref stays our unique per-attempt reference (already a fresh UUID), and
     verify still works by that same reference.
  2. Passes the buyer's name + phone into the metadata from both upgrade flows
     (marketplace subscription, artisan boost) so the customer object is complete.

Frontends already redirect to the hosted checkout link (data.link) — web via
window.location, mobile via the checkout WebView — so no inline modal to change.

RUN FROM THE BACKEND ROOT:
    python3 flutterwave_payload_patch/apply_flutterwave_payload.py
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


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
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:200]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


# --------------------------------------------------------- 1. rewrite adapter
ADAPTER = r'''"""
Flutterwave payment gateway adapter (API v3).

Used for Marketplace and Artisan listing-upgrade payments (Pro/Premium tiers and
artisan boosts). Amounts are sent in MAJOR units. We initialise with our own
unique tx_ref (the internal reference) and verify with verify_by_reference, so
the pipeline is unchanged and never needs Flutterwave's numeric id.

The payload is kept strict and fully populated — payment_options set to "card",
a complete customer object, and no null/empty values — because Flutterwave's
hosted card component throws (card-payment.vue "reading 'switch'") when those are
missing.
"""
from __future__ import annotations

import hmac
from decimal import Decimal

from integrations.base import register
from integrations.base.dto import ChargeInit, ChargeStatus, TxnStatus
from integrations.base.interfaces import PaymentGateway


def _flw_redirect_url(config: dict) -> str:
    """Where Flutterwave returns the user after payment (config -> settings -> env)."""
    import os

    val = (config or {}).get("redirect_url", "")
    if val:
        return val
    try:
        from django.conf import settings

        val = (getattr(settings, "FLUTTERWAVE_REDIRECT_URL", "")
               or getattr(settings, "PAYSTACK_CALLBACK_URL", ""))
    except Exception:
        val = ""
    return (val
            or os.environ.get("FLUTTERWAVE_REDIRECT_URL", "")
            or os.environ.get("PAYSTACK_CALLBACK_URL", ""))


@register("payments", "flutterwave")
class FlutterwaveGateway(PaymentGateway):
    base_url = "https://api.flutterwave.com/v3"

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.config.get('secret_key', '')}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def initialize_charge(self, *, amount, currency, email, reference, metadata=None):
        # Pull customer name/phone out of metadata so they don't get echoed into
        # `meta`; everything else in metadata stays for webhook routing.
        meta = dict(metadata or {})
        cust_name = str(meta.pop("name", "") or "").strip()
        cust_phone = str(meta.pop("phone", "") or "").strip()
        if not cust_name:
            cust_name = (str(email).split("@")[0] if email else "") or "OAM Customer"

        customer = {"email": email or "", "name": cust_name}
        if cust_phone:
            customer["phonenumber"] = cust_phone

        payload = {
            "tx_ref": reference,                       # unique per attempt
            "amount": str(amount),                     # major units, non-null
            "currency": (currency or "NGN").upper(),   # never null
            "payment_options": "card",                 # explicit, never null/empty
            "customer": customer,
            "customizations": {
                "title": "OAM",
                "description": str(meta.get("description") or "OAM listing upgrade"),
            },
            "meta": meta,
        }
        redirect = _flw_redirect_url(self.config)
        if redirect:                                   # only send when non-empty
            payload["redirect_url"] = redirect

        data = self.post("/payments", json=payload)
        d = data.get("data", {}) or {}
        return ChargeInit(
            authorization_url=d.get("link", ""),
            access_code="",
            provider_reference=reference,
            raw=data,
        )

    def verify_charge(self, reference):
        data = self.get("/transactions/verify_by_reference",
                        params={"tx_ref": reference})
        d = data.get("data", {}) or {}
        st = (d.get("status") or "").lower()
        status = (TxnStatus.SUCCESS if st == "successful"
                  else TxnStatus.FAILED if st in ("failed", "cancelled")
                  else TxnStatus.PENDING)
        return ChargeStatus(
            status=status,
            amount=Decimal(str(d.get("amount", 0))),
            currency=d.get("currency", ""),
            provider_reference=str(d.get("id") or reference),
            raw=data,
        )

    def verify_webhook(self, payload, headers):
        expected = str(self.config.get("secret_hash", ""))
        got = str((headers or {}).get("verif-hash", ""))
        return bool(expected) and hmac.compare_digest(expected, got)
'''
pkg = _p("integrations", "payments", "flutterwave")
os.makedirs(pkg, exist_ok=True)
init_file = os.path.join(pkg, "__init__.py")
if not os.path.exists(init_file):
    open(init_file, "w").close()
open(os.path.join(pkg, "adapter.py"), "w", encoding="utf-8").write(ADAPTER)
print("  + wrote integrations/payments/flutterwave/adapter.py (strict payload)")

# --------------------------------------------- 2. pass name/phone in metadata
_NAME = ('(f"{getattr(user, \'first_name\', \'\')} {getattr(user, \'last_name\', \'\')}".strip()'
         ' or getattr(user, "email", "") or "OAM Customer")')

edit("apps/marketplace/services.py", [(
    '                metadata={"purpose": "marketplace_subscription", "tier": tier,\n'
    '                          "user": str(user.id)},',
    '                metadata={"purpose": "marketplace_subscription", "tier": tier,\n'
    '                          "user": str(user.id),\n'
    f'                          "name": {_NAME},\n'
    '                          "phone": getattr(user, "phone", "") or ""},',
)])

edit("apps/homeservices/services.py", [(
    '                metadata={"purpose": "artisan_boost", "days": days, "user": str(user.id)},',
    '                metadata={"purpose": "artisan_boost", "days": days, "user": str(user.id),\n'
    f'                          "name": {_NAME},\n'
    '                          "phone": getattr(user, "phone", "") or ""},',
)])

print("\nDONE. Flutterwave payload hardened (payment_options=card, full customer, no nulls).")
