"""
Paystack Transfers (real).  DEFAULT_PROVIDER_PAYOUTS=paystack

Config (settings.PROVIDER_CONFIG['payouts']['paystack']): secret_key

Amounts are sent in the smallest unit (kobo for NGN). Transfers require a
funded Paystack balance and Transfers enabled on the account; in test mode
Paystack simulates them.
"""
from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

from integrations.base import register
from integrations.base.client import BaseProviderClient
from integrations.base.exceptions import ProviderError, ProviderValidationError


@register("payouts", "paystack")
class PaystackPayouts(BaseProviderClient):
    provider_key = "paystack"
    category = "payouts"
    base_url = "https://api.paystack.co"

    def _headers(self):
        return {"Accept": "application/json", "Content-Type": "application/json",
                "Authorization": f"Bearer {self.config.get('secret_key', '')}"}

    def list_banks(self, currency="NGN"):
        # Return the COMPLETE bank list. Paystack's /bank returns only ~50 by
        # default and paginates; we page through, dedupe by code, and stop as
        # soon as a page adds nothing new — which also guards against Paystack
        # ignoring `page` (cursor pagination) and repeating the same page.
        seen, banks, page, per_page = set(), [], 1, 100
        for _ in range(30):
            body = self.get(
                f"/bank?currency={currency}&perPage={per_page}&page={page}")
            data = body.get("data") or []
            if not data:
                break
            added = 0
            for b in data:
                code = b.get("code")
                if code and code not in seen:
                    seen.add(code)
                    banks.append({"name": b.get("name"), "code": code,
                                  "currency": b.get("currency", currency)})
                    added += 1
            if added == 0 or len(data) < per_page:   # last page, or no new banks
                break
            page += 1
        return banks

    def resolve_account(self, *, account_number, bank_code, currency="NGN"):
        body = self.get(f"/bank/resolve?account_number={account_number}&bank_code={bank_code}")
        if not body.get("status"):
            raise ProviderValidationError("paystack", body.get("message", "Could not resolve account"))
        d = body.get("data", {}) or {}
        return {"account_name": d.get("account_name"),
                "account_number": d.get("account_number"), "bank_code": bank_code}

    def create_recipient(self, *, name, account_number, bank_code, currency="NGN"):
        body = self.post("/transferrecipient", json={
            "type": "nuban", "name": name, "account_number": account_number,
            "bank_code": bank_code, "currency": currency,
        })
        if not body.get("status"):
            raise ProviderValidationError("paystack", body.get("message", "Recipient creation failed"))
        return (body.get("data", {}) or {}).get("recipient_code", "")

    def initiate_transfer(self, *, amount, recipient_code, reference, currency="NGN", reason=""):
        subunits = int((Decimal(str(amount)) * 100).to_integral_value())
        try:
            body = self.post("/transfer", json={
                "source": "balance", "amount": subunits, "recipient": recipient_code,
                "reference": reference, "reason": reason or "Withdrawal",
            })
        except ProviderValidationError as exc:
            # business failure (e.g. insufficient Paystack balance) -> mark failed, not crash
            return {"status": "failed", "provider_reference": "", "raw": {"error": str(exc)}}
        if not body.get("status"):
            return {"status": "failed", "provider_reference": "", "raw": body}
        d = body.get("data", {}) or {}
        return {"status": (d.get("status") or "pending"),
                "provider_reference": d.get("transfer_code", "") or d.get("reference", ""),
                "raw": body}

    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        secret = self.config.get("secret_key", "").encode()
        body = payload if isinstance(payload, bytes) else str(payload).encode()
        sig = (headers or {}).get("x-paystack-signature", "")
        computed = hmac.new(secret, body, hashlib.sha512).hexdigest()
        return bool(sig) and hmac.compare_digest(computed, sig)
