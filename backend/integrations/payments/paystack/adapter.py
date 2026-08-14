"""
Paystack payment gateway adapter (API integration).

Auth: Bearer secret key. Amounts are sent in the currency's SUBUNIT (kobo/cents),
so we multiply by 100. Webhooks are verified with HMAC-SHA512 of the raw request
body using the secret key (Paystack sends it in the X-Paystack-Signature header).

Config: PROVIDER_CONFIG["payments"]["paystack"] -> secret_key, public_key.
"""
from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

from integrations.base import register
from integrations.base.dto import ChargeInit, ChargeStatus, TxnStatus
from integrations.base.interfaces import PaymentGateway


def _paystack_callback_url():
    """Where Paystack should send the user after payment (overrides dashboard)."""
    import os
    try:
        from django.conf import settings
        val = getattr(settings, "PAYSTACK_CALLBACK_URL", "")
    except Exception:
        val = ""
    return val or os.environ.get("PAYSTACK_CALLBACK_URL", "")


@register("payments", "paystack")
class PaystackGateway(PaymentGateway):
    base_url = "https://api.paystack.co"

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.config.get('secret_key', '')}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def initialize_charge(self, *, amount, currency, email, reference, metadata=None, callback_url=None):
        subunits = int((Decimal(str(amount)) * 100).to_integral_value())
        payload = {
            "email": email, "amount": subunits, "currency": currency,
            "reference": reference, "metadata": metadata or {},
        }
        _cb = callback_url or _paystack_callback_url()
        if _cb:
            payload["callback_url"] = _cb
        data = self.post("/transaction/initialize", json=payload)
        d = data.get("data", {}) or {}
        return ChargeInit(
            authorization_url=d.get("authorization_url", ""),
            access_code=d.get("access_code", ""),
            provider_reference=d.get("reference", reference),
            raw=data,
        )

    def verify_charge(self, reference):
        data = self.get(f"/transaction/verify/{reference}")
        d = data.get("data", {}) or {}
        st = d.get("status")
        status = (TxnStatus.SUCCESS if st == "success"
                  else TxnStatus.FAILED if st in ("failed", "abandoned", "reversed")
                  else TxnStatus.PENDING)
        return ChargeStatus(
            status=status,
            amount=Decimal(str(d.get("amount", 0))) / 100,
            currency=d.get("currency", ""),
            provider_reference=reference, raw=data,
        )

    def verify_webhook(self, payload, headers):
        secret = self.config.get("secret_key", "").encode()
        body = payload if isinstance(payload, bytes) else str(payload).encode()
        signature = (headers or {}).get("x-paystack-signature", "")
        computed = hmac.new(secret, body, hashlib.sha512).hexdigest()
        return bool(signature) and hmac.compare_digest(computed, signature)
