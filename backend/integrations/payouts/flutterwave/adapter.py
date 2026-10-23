"""
Flutterwave Transfers (real).  DEFAULT_PROVIDER_PAYOUTS=flutterwave

Config (settings.PROVIDER_CONFIG['payouts']['flutterwave']): secret_key, secret_hash

Withdrawals are paid from the Flutterwave NGN balance — the same balance card,
bank-transfer and USSD deposits collect into (Flutterwave doesn't sweep it to
the bank on its own), so the money users fund their wallets with is what pays
their withdrawals.

Amounts are sent in MAJOR units. Flutterwave has no recipient objects, so a
"recipient code" here is just "FLW:<bank_code>:<account_number>". Accounts
saved while Paystack was the provider (RCP_... codes, Paystack bank codes) are
mapped onto Flutterwave's bank list by code, then by bank name.

Flutterwave only accepts transfer requests from whitelisted server IPs
(Settings > Whitelisted IP addresses); a refusal for that reason is reported
to staff and the withdrawal waits in the queue — the customer is not refunded.
Render's outbound IPs change between deploys and Flutterwave takes single IPs
only, so set FLUTTERWAVE_PROXY_URL (a fixed-IP proxy such as QuotaGuard Static
or Fixie) and whitelist the proxy's IPs: transfer calls then go through it.
Other calls (banks, account lookup, balance) don't need the whitelist and go direct.
"""
from __future__ import annotations

import re
from decimal import Decimal

from integrations.base import register
from integrations.base.client import BaseProviderClient
from integrations.base.exceptions import ProviderAuthError, ProviderError, ProviderValidationError

PREFIX = "FLW:"

# Flutterwave transfer status -> the lowercase statuses WithdrawalService understands.
_STATUS = {"successful": "success", "success": "success", "failed": "failed",
           "new": "pending", "pending": "pending"}


def _norm(name: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", str(name or "").lower())
    s = re.sub(r"\b(plc|ltd|limited|nigeria|bank|of|the|mfb|microfinance)\b", " ", s)
    return " ".join(s.split())


def _message(exc: ProviderError) -> str:
    detail = exc.raw if isinstance(exc.raw, dict) else {}
    return str(detail.get("message") or "").strip()


@register("payouts", "flutterwave")
class FlutterwavePayouts(BaseProviderClient):
    base_url = "https://api.flutterwave.com/v3"

    def _headers(self):
        return {"Accept": "application/json", "Content-Type": "application/json",
                "Authorization": f"Bearer {self.config.get('secret_key', '')}"}

    def _request(self, method, path, **kwargs):
        proxy = str(self.config.get("proxy_url") or "").strip()
        if proxy and path.startswith("/transfers"):
            kwargs.setdefault("proxies", {"http": proxy, "https": proxy})
        return super()._request(method, path, **kwargs)

    # ---------------- banks & accounts ----------------
    def list_banks(self, currency="NGN"):
        from django.core.cache import cache

        key = f"flw:banks:{currency.upper()}"
        cached = cache.get(key)
        if cached:
            return cached
        country = {"NGN": "NG", "GHS": "GH", "KES": "KE", "UGX": "UG", "ZAR": "ZA"}.get(currency.upper(), "NG")
        body = self.get(f"/banks/{country}")
        seen, banks = set(), []
        for b in body.get("data") or []:
            code = str(b.get("code") or "")
            if code and code not in seen:
                seen.add(code)
                banks.append({"name": b.get("name"), "code": code, "currency": currency.upper()})
        banks.sort(key=lambda b: str(b["name"] or "").lower())
        if banks:
            cache.set(key, banks, 12 * 3600)
        return banks

    def resolve_account(self, *, account_number, bank_code, currency="NGN"):
        try:
            body = self.post("/accounts/resolve",
                             json={"account_number": str(account_number), "account_bank": str(bank_code)})
        except ProviderValidationError as exc:
            raise ProviderValidationError("flutterwave", _message(exc) or "Could not resolve account",
                                          raw=exc.raw) from exc
        if str(body.get("status")).lower() != "success":
            raise ProviderValidationError("flutterwave", body.get("message") or "Could not resolve account")
        d = body.get("data") or {}
        bank_name = next((b["name"] for b in self._banks_safe(currency) if b["code"] == str(bank_code)), "")
        return {"account_name": d.get("account_name"), "bank_name": bank_name,
                "account_number": d.get("account_number") or account_number, "bank_code": bank_code}

    def create_recipient(self, *, name, account_number, bank_code, currency="NGN"):
        return f"{PREFIX}{bank_code}:{account_number}"

    def _banks_safe(self, currency="NGN"):
        try:
            return self.list_banks(currency)
        except ProviderError:
            return []

    def recipient_from_account(self, bank_account) -> str:
        """Recipient for a saved account, including ones saved under Paystack."""
        code = str(getattr(bank_account, "recipient_code", "") or "")
        if code.startswith(PREFIX):
            return code
        bank_code = str(bank_account.bank_code)
        banks = self._banks_safe(getattr(bank_account, "currency", "NGN") or "NGN")
        if banks and not any(b["code"] == bank_code for b in banks):
            want = _norm(getattr(bank_account, "bank_name", ""))
            match = next((b for b in banks if want and _norm(b["name"]) == want), None)
            if match:
                bank_code = match["code"]
        return f"{PREFIX}{bank_code}:{bank_account.account_number}"

    # ---------------- transfers ----------------
    def initiate_transfer(self, *, amount, recipient_code, reference, currency="NGN", reason=""):
        if not str(recipient_code).startswith(PREFIX):
            return {"status": "failed", "provider_reference": "",
                    "raw": {"error": "bank account needs re-linking for Flutterwave",
                            "message": "bank account needs re-linking for Flutterwave"}}
        bank_code, account_number = str(recipient_code)[len(PREFIX):].split(":", 1)
        payload = {
            "account_bank": bank_code, "account_number": account_number,
            "amount": float(Decimal(str(amount)).quantize(Decimal("0.01"))),
            "currency": currency.upper(), "debit_currency": currency.upper(),
            "reference": reference, "narration": (reason or "OAM withdrawal")[:100],
        }
        try:
            body = self.post("/transfers", json=payload)
        except (ProviderValidationError, ProviderAuthError) as exc:
            # Business refusal (empty balance, IP not whitelisted, transfers off):
            # mark failed with Flutterwave's own words so WithdrawalService can
            # tell an operator-side problem from a bad account.
            message = _message(exc)
            if isinstance(exc, ProviderAuthError) and not message:
                message = "auth rejected - check FLUTTERWAVE_SECRET_KEY"
            return {"status": "failed", "provider_reference": "",
                    "raw": {"error": f"{exc}: {message}" if message else str(exc),
                            "message": message, "flutterwave": exc.raw if isinstance(exc.raw, dict) else {}}}
        if str(body.get("status")).lower() != "success":
            return {"status": "failed", "provider_reference": "",
                    "raw": {**body, "message": str(body.get("message") or "")}}
        d = body.get("data") or {}
        status = _STATUS.get(str(d.get("status") or "").lower(), "pending")
        if status == "failed":
            body = {**body, "message": str(d.get("complete_message") or body.get("message") or "")}
        return {"status": status, "provider_reference": str(d.get("id") or ""), "raw": body}

    def fetch_transfer_status(self, transfer_id):
        """Flutterwave's current status for a transfer, mapped to success/failed/pending, or None."""
        try:
            body = self.get(f"/transfers/{transfer_id}")
        except ProviderError:
            return None
        raw = str((body.get("data") or {}).get("status") or "").lower()
        return _STATUS.get(raw) if raw else None

    def get_balance(self, currency="NGN"):
        """Available NGN balance in major units, or None if Flutterwave won't say."""
        try:
            body = self.get(f"/balances/{currency.upper()}")
        except ProviderError:
            return None
        d = body.get("data") or {}
        if isinstance(d, list):
            d = next((r for r in d if str(r.get("currency", "")).upper() == currency.upper()), {})
        val = d.get("available_balance")
        return None if val is None else Decimal(str(val)).quantize(Decimal("0.01"))

    def verify_webhook(self, payload, headers):
        import hmac
        expected = str(self.config.get("secret_hash", ""))
        got = str((headers or {}).get("verif-hash", ""))
        return bool(expected) and hmac.compare_digest(expected, got)
