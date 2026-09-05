"""
Reloadly international airtime API client.

Encapsulates all HTTP to Reloadly: OAuth token (cached until expiry), country /
operator discovery, FX, top-up and status. Sandbox vs live is env-driven, and
every numeric field is coerced safely so the rest of the app sees clean types.

Env / settings:
    RELOADLY_CLIENT_ID          required
    RELOADLY_CLIENT_SECRET      required
    RELOADLY_MODE               "sandbox" (default) or "live"
"""
from __future__ import annotations

import logging
import os
import time

import requests

try:
    from django.conf import settings
except Exception:  # importable outside Django
    settings = None

logger = logging.getLogger(__name__)

AUTH_URL = "https://auth.reloadly.com/oauth/token"
SANDBOX_BASE = "https://topups-sandbox.reloadly.com"
LIVE_BASE = "https://topups.reloadly.com"
ACCEPT = "application/com.reloadly.topups-v1+json"


class ReloadlyError(Exception):
    """Any Reloadly failure (auth, network, non-2xx, non-JSON)."""


def _cfg(name: str, default: str = "") -> str:
    val = getattr(settings, name, None) if settings is not None else None
    return val or os.environ.get(name, default)


def _mode() -> str:
    return (_cfg("RELOADLY_MODE", "sandbox") or "sandbox").lower()


def _base_url() -> str:
    return LIVE_BASE if _mode() == "live" else SANDBOX_BASE


# ---- safe casters ----------------------------------------------------------
def s(v) -> str:
    return "" if v is None else str(v).strip()


def f(v) -> float:
    try:
        return float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


class ReloadlyClient:
    def __init__(self, client_id: str | None = None, client_secret: str | None = None, timeout: int = 30):
        self.client_id = client_id or _cfg("RELOADLY_CLIENT_ID")
        self.client_secret = client_secret or _cfg("RELOADLY_CLIENT_SECRET")
        self.base_url = _base_url()
        self.timeout = timeout
        self._token = None
        self._token_exp = 0.0

    # -------------------------------------------------- auth
    def _access_token(self) -> str:
        # cached until ~60s before expiry
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
            "audience": self.base_url,   # audience must match the target env base
        }
        try:
            resp = requests.post(AUTH_URL, json=payload, timeout=self.timeout,
                                 headers={"Content-Type": "application/json"})
            data = resp.json()
        except (requests.RequestException, ValueError) as exc:
            raise ReloadlyError("Could not authenticate with the airtime service.") from exc
        token = data.get("access_token")
        if not token:
            raise ReloadlyError(s(data.get("error_description")) or "Airtime authentication failed.")
        self._token = token
        self._token_exp = time.time() + f(data.get("expires_in") or 3600)
        return token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._access_token()}",
            "Accept": ACCEPT,
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, *, params=None, json=None) -> dict | list:
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            resp = requests.request(method, url, headers=self._headers(),
                                    params=params, json=json, timeout=self.timeout)
        except requests.RequestException as exc:
            logger.warning("Reloadly network error on %s %s: %s", method, path, exc)
            raise ReloadlyError("Could not reach the airtime service. Please try again.") from exc
        try:
            data = resp.json()
        except ValueError:
            if resp.ok:
                return {}
            raise ReloadlyError(f"Airtime service error (HTTP {resp.status_code}).")
        if not resp.ok:
            msg = "Airtime request failed."
            if isinstance(data, dict):
                msg = s(data.get("message")) or s(data.get("errorCode")) or msg
            raise ReloadlyError(msg)
        return data

    # -------------------------------------------------- discovery
    def countries(self) -> list:
        return self._request("GET", "/countries") or []

    def operators_by_country(self, iso2: str, *, suggested_amounts=True) -> list:
        return self._request("GET", f"/operators/countries/{s(iso2).upper()}",
                             params={"suggestedAmounts": str(bool(suggested_amounts)).lower()}) or []

    def operator(self, operator_id) -> dict:
        return self._request("GET", f"/operators/{s(operator_id)}",
                             params={"suggestedAmounts": "true"}) or {}

    def autodetect_operator(self, *, phone: str, iso2: str) -> dict:
        return self._request("GET", f"/operators/auto-detect/phone/{s(phone)}/countries/{s(iso2).upper()}") or {}

    def fx_rate(self, *, operator_id, amount) -> dict:
        return self._request("POST", "/operators/fx-rate",
                             json={"operatorId": s(operator_id), "amount": f(amount)}) or {}

    # -------------------------------------------------- topup
    def topup(self, *, operator_id, amount, recipient_number, recipient_iso2,
              use_local_amount=False, sender_number="", custom_identifier="") -> dict:
        body = {
            "operatorId": s(operator_id),
            "amount": f(amount),
            "useLocalAmount": bool(use_local_amount),
            "recipientPhone": {"countryCode": s(recipient_iso2).upper(), "number": s(recipient_number)},
        }
        if sender_number:
            body["senderPhone"] = {"countryCode": "NG", "number": s(sender_number)}
        if custom_identifier:
            body["customIdentifier"] = s(custom_identifier)
        return self._request("POST", "/topups", json=body) or {}

    def topup_status(self, transaction_id) -> dict:
        return self._request("GET", f"/topups/{s(transaction_id)}/status") or {}

    # -------------------------------------------------- normalisers
    @staticmethod
    def normalize_operator(o: dict) -> dict:
        fx = o.get("fx") or {}
        return {
            "operator_id": s(o.get("operatorId") or o.get("id")),
            "name": s(o.get("name")),
            "logo": (o.get("logoUrls") or [""])[0] if o.get("logoUrls") else "",
            "country_iso": s((o.get("country") or {}).get("isoName")),
            "country_name": s((o.get("country") or {}).get("name")),
            "sender_currency": s(o.get("senderCurrencyCode")),
            "destination_currency": s(o.get("destinationCurrencyCode")),
            "denomination_type": s(o.get("denominationType")),          # FIXED | RANGE
            "international_discount": f(o.get("internationalDiscount")), # % — OAM margin
            "local_discount": f(o.get("localDiscount")),
            "fx_rate": f(fx.get("rate")),                               # local per 1 sender-currency
            "min_amount": f(o.get("minAmount")),
            "max_amount": f(o.get("maxAmount")),
            "local_min": f(o.get("localMinAmount")),
            "local_max": f(o.get("localMaxAmount")),
            "fixed_amounts": [f(x) for x in (o.get("fixedAmounts") or [])],
            "local_fixed_amounts": [f(x) for x in (o.get("localFixedAmounts") or [])],
            "suggested_amounts": [f(x) for x in (o.get("suggestedAmounts") or [])],
        }


reloadly = ReloadlyClient()
