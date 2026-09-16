# integrations/payments/flutterwave/adapter.py
"""
Flutterwave payment gateway adapter (API v3).

Used for:
  * Marketplace and Artisan listing-upgrade payments (Pro/Premium tiers and
    artisan boosts).
  * International airtime card top-ups (Reloadly).

Amounts are sent in MAJOR units. We initialise with our own unique tx_ref (the
internal reference) and verify with verify_by_reference, so the pipeline is
unchanged and never needs Flutterwave's numeric id.

The payload is kept strict and fully populated — payment_options set to "card",
a complete customer object, and no null/empty values — because Flutterwave's
hosted card component throws (card-payment.vue "reading 'switch'") when those
are missing.
"""
from __future__ import annotations

import hmac
from decimal import Decimal

from integrations.base import register
from integrations.base.dto import ChargeInit, ChargeStatus, TxnStatus
from integrations.base.interfaces import PaymentGateway


def _flw_redirect_url(config: dict) -> str:
    """Configured default return URL (env -> settings)."""
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

    def initialize_charge(self, *, amount, currency, email, reference, metadata=None,
                          callback_url=None, subaccount=None,
                          transaction_charge=None, bearer=None):
        # `subaccount`, `transaction_charge` and `bearer` are Paystack-only
        # concepts; they are accepted here so FundingService.initialize can
        # call every gateway uniformly, and intentionally ignored.
        meta = dict(metadata or {})
        cust_name = str(meta.pop("name", "") or "").strip()
        cust_phone = str(meta.pop("phone", "") or "").strip()
        if not cust_name:
            cust_name = (str(email).split("@")[0] if email else "") or "OAM Customer"

        customer = {"email": email or "", "name": cust_name}
        if cust_phone:
            customer["phonenumber"] = cust_phone

        payload = {
            "tx_ref": reference,
            "amount": str(amount),
            "currency": (currency or "NGN").upper(),
            "payment_options": "card",
            "customer": customer,
            "customizations": {
                "title": "OAM",
                "description": str(meta.get("description") or "OAM payment"),
            },
            "meta": meta,
        }
        # Caller-supplied callback_url wins over the configured default, so a
        # per-flow return (e.g. an airtime deep-link bounce page) can be used.
        redirect = (callback_url or "").strip() or _flw_redirect_url(self.config)
        if redirect:
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