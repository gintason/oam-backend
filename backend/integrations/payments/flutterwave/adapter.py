"""
Flutterwave payment gateway adapter (API v3).

Used for Marketplace and Artisan *listing-upgrade* payments — the Pro/Premium
seller tiers and artisan boosts — which benefit from Flutterwave's broader
international card acceptance. Wallet funding, bills and every other charge stay
on the default gateway (Paystack); only the two upgrade flows are routed here.

Key differences from Paystack, handled below:
  * Amounts are sent in MAJOR units (e.g. 2500 == NGN 2,500), not kobo/subunits.
  * We initialise with our own `tx_ref` (the internal reference) and verify with
    `/transactions/verify_by_reference?tx_ref=...`, so the rest of the pipeline —
    which keys everything off our internal reference — is unchanged and never
    needs to store Flutterwave's numeric transaction id.
  * Webhooks are authenticated by comparing the `verif-hash` header to the secret
    hash configured in the Flutterwave dashboard (not an HMAC of the body).

Config: PROVIDER_CONFIG["payments"]["flutterwave"] ->
    secret_key, public_key, secret_hash, redirect_url
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
        payload = {
            "tx_ref": reference,
            "amount": str(amount),                 # major units - no *100
            "currency": currency,
            "customer": {"email": email},
            "meta": metadata or {},
            "customizations": {"title": "OAM"},
        }
        redirect = _flw_redirect_url(self.config)
        if redirect:
            payload["redirect_url"] = redirect

        data = self.post("/payments", json=payload)
        d = data.get("data", {}) or {}
        return ChargeInit(
            authorization_url=d.get("link", ""),
            access_code="",
            provider_reference=reference,          # our ref; FLW id resolved at verify
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
            amount=Decimal(str(d.get("amount", 0))),   # major units
            currency=d.get("currency", ""),
            provider_reference=str(d.get("id") or reference),
            raw=data,
        )

    def verify_webhook(self, payload, headers):
        expected = str(self.config.get("secret_hash", ""))
        got = str((headers or {}).get("verif-hash", ""))
        return bool(expected) and hmac.compare_digest(expected, got)
