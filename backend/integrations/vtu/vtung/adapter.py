"""
VTU.ng provider adapter (real, live-money).

Auth: username/password -> JWT (valid 7 days, only the latest token is active),
so we cache the token and only refetch on expiry / 403.

Async model: airtime returns 'processing-api' then settles to 'completed-api'
or 'refunded'. We map:
    completed-api                         -> SUCCESS  (capture)
    refunded / failed / cancelled         -> FAILED   (release/refund the user)
    processing / queued / initiated / ... -> PENDING  (keep the hold; requery/webhook)

request_id is OUR BillOrder.reference so we can requery by it later.

Config (settings.PROVIDER_CONFIG['vtu']['vtung']):
    username, password, user_pin
"""
from __future__ import annotations

import hashlib
import hmac

import requests
from django.core.cache import cache

from integrations.base import register
from integrations.base.dto import StatusResult, TxnStatus, VTUResult
from integrations.base.exceptions import (
    ProviderAuthError,
    ProviderTimeout,
    ProviderUnavailable,
    ProviderValidationError,
)
from integrations.base.interfaces import VTUProvider

BASE = "https://vtu.ng/wp-json"
TOKEN_CACHE_KEY = "vtung:jwt"
TOKEN_TTL = 6 * 24 * 3600            # ~6 days (< 7-day expiry)
TIMEOUT = (5, 60)


@register("vtu", "vtung")
class VtuNgAdapter(VTUProvider):
    """Uses the new Partner API (v1) when VTU_NG_SECRET_KEY is set, else the legacy API."""
    base_url = BASE

    @property
    def v1(self):
        if not str(self.config.get("secret_key") or "").strip():
            return None
        if getattr(self, "_v1", None) is None:
            from .v1 import VtuNgV1
            self._v1 = VtuNgV1(self.config)
        return self._v1

    # ---------------- auth ----------------
    def _get_token(self, force=False) -> str:
        if not force:
            cached = cache.get(TOKEN_CACHE_KEY)
            if cached:
                return cached
        try:
            resp = requests.post(
                f"{BASE}/jwt-auth/v1/token",
                json={"username": self.config.get("username", ""),
                      "password": self.config.get("password", "")},
                timeout=TIMEOUT,
            )
        except requests.Timeout as exc:
            raise ProviderTimeout("vtung", "auth timeout") from exc
        except requests.RequestException as exc:
            raise ProviderUnavailable("vtung", str(exc)) from exc
        data = resp.json() if resp.content else {}
        if resp.status_code != 200 or "token" not in data:
            raise ProviderAuthError("vtung", data.get("message", "auth failed"), raw=data)
        cache.set(TOKEN_CACHE_KEY, data["token"], TOKEN_TTL)
        return data["token"]

    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}",
                "Content-Type": "application/json", "Accept": "application/json"}

    def _post(self, path, payload):
        token = self._get_token()
        try:
            resp = requests.post(f"{BASE}{path}", json=payload,
                                 headers=self._auth_headers(token), timeout=TIMEOUT)
            if resp.status_code == 403:                 # token stale/invalidated -> refresh once
                token = self._get_token(force=True)
                resp = requests.post(f"{BASE}{path}", json=payload,
                                     headers=self._auth_headers(token), timeout=TIMEOUT)
        except requests.Timeout as exc:
            raise ProviderTimeout("vtung", f"{path} timeout") from exc
        except requests.RequestException as exc:
            raise ProviderUnavailable("vtung", str(exc)) from exc
        return resp

    def _get(self, path, params=None):
        token = self._get_token()
        try:
            resp = requests.get(f"{BASE}{path}", params=params,
                                headers=self._auth_headers(token), timeout=TIMEOUT)
            if resp.status_code == 403:
                token = self._get_token(force=True)
                resp = requests.get(f"{BASE}{path}", params=params,
                                    headers=self._auth_headers(token), timeout=TIMEOUT)
        except requests.Timeout as exc:
            raise ProviderTimeout("vtung", f"{path} timeout") from exc
        except requests.RequestException as exc:
            raise ProviderUnavailable("vtung", str(exc)) from exc
        return resp

    # ---------------- purchase ----------------
    def purchase(self, req) -> VTUResult:
        if self.v1:
            return self.v1.purchase(req)
        request_id = (getattr(req, "request_id", "") or "")[:50]
        if req.service == "airtime":
            payload = {"request_id": request_id, "phone": req.recipient,
                       "service_id": req.operator.lower(), "amount": int(req.amount)}
            resp = self._post("/api/v2/airtime", payload)
        elif req.service == "data":
            payload = {"request_id": request_id, "phone": req.recipient,
                       "service_id": req.operator.lower(), "variation_id": req.plan_code}
            resp = self._post("/api/v2/data", payload)
        elif req.service == "cable":
            payload = {"request_id": request_id, "customer_id": req.recipient,
                       "service_id": req.operator.lower(), "variation_id": req.plan_code,
                       "subscription_type": "change"}
            resp = self._post("/api/v2/tv", payload)
        elif req.service == "electricity":
            payload = {"request_id": request_id, "customer_id": req.recipient,
                       "service_id": req.operator.lower(), "variation_id": req.plan_code,
                       "amount": int(req.amount)}
            resp = self._post("/api/v2/electricity", payload)
        elif req.service == "betting":
            # service_id is the exact provider name (e.g. "Bet9ja"); amount is the
            # betting credit (the OAM fee is kept in the wallet layer, not sent here).
            payload = {"request_id": request_id, "customer_id": req.recipient,
                       "service_id": req.operator, "amount": int(req.amount)}
            resp = self._post("/api/v2/betting", payload)
        else:
            # data / electricity / cable arrive in later chunks
            raise ProviderValidationError("vtung", f"service '{req.service}' not integrated yet")
        return self._parse(resp, request_id)

    def get_status(self, provider_reference) -> StatusResult:
            """
            provider_reference here is OUR request_id (BillOrder.reference).
            (v1: looked up via the Idempotency-Key we sent, see v1.py.)

            VTU's requery returns TWO layers: `data` (the order as first recorded,
            which may still say processing with token=null) and `resolve.data` (the
            RESOLVED outcome plus meta_data.electricity_token). The resolved layer,
            when present, is the truth.
            """
            if self.v1:
                return self.v1.get_status(provider_reference)
            resp = self._post("/api/v2/requery", {"request_id": provider_reference})
            try:
                data = resp.json()
            except ValueError:
                data = {}
            d = data.get("data", {}) or {}
            resolved = (data.get("resolve", {}) or {}).get("data", {}) or {}

            status_str = (resolved.get("status") or d.get("status") or "").lower()
            order_id = str(resolved.get("order_id") or d.get("order_id") or "")

            return StatusResult(status=self._map(status_str),
                                provider_reference=order_id, raw=data)
    

    # ---------------- catalog (data bundles) ----------------
    def list_variations(self, category, operator):
        """Live catalog for data bundles or cable packages."""
        if self.v1:
            return self.v1.list_variations(category, operator)
        if category == "data":
            path = "/api/v2/variations/data"
        elif category == "cable":
            path = "/api/v2/variations/tv"
        else:
            return []
        resp = self._get(path, {"service_id": operator.lower()})
        try:
            data = resp.json()
        except ValueError:
            return []
        d = data.get("data", data) or {}
        variations = d.get("variations") if isinstance(d, dict) else d
        result = []
        for v in (variations or []):
            availability = str(v.get("availability", "")).lower()
            if availability and availability != "available":
                continue                        # skip plans VTU marks unavailable
            result.append({
                "variation_id": str(v.get("variation_id") or v.get("id") or ""),
                "name": (v.get("data_plan") or v.get("package_bouquet") or v.get("package")
                         or v.get("name") or v.get("service_name") or ""),
                "price": str(v.get("price") or v.get("amount") or ""),          # retail (user pays)
                "reseller_price": str(v.get("reseller_price") or ""),           # our cost to VTU
                "validity": (v.get("validity") or v.get("duration") or ""),
            })
        return result

    # ---------------- customer verification ----------------
    def verify_customer(self, service_id, customer_id, variation=None):
        """Validate a meter/smartcard/account and return the customer's details."""
        if self.v1:
            return self.v1.verify_customer(service_id, customer_id, variation)
        payload = {"customer_id": customer_id, "service_id": service_id}
        if variation:
            payload["variation_id"] = variation
        resp = self._post("/api/v2/verify-customer", payload)
        try:
            data = resp.json()
        except ValueError:
            data = {}
        if resp.status_code >= 400 or data.get("code") != "success":
            raise ProviderValidationError("vtung", data.get("message", "Verification failed"))
        return data.get("data", {}) or {}

    # ---------------- webhook ----------------
    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        if self.v1:
            return self._verify_v1_webhook(payload, headers)
        pin = self.config.get("user_pin", "").encode()
        body = payload if isinstance(payload, bytes) else str(payload).encode()
        sig = (headers or {}).get("x-signature", "")
        computed = hmac.new(pin, body, hashlib.sha256).hexdigest()
        return bool(sig) and hmac.compare_digest(computed, sig)

    def _verify_v1_webhook(self, payload, headers) -> bool:
        """
        X-VTU-Signature-256 with the dashboard's signing secret. VTU.ng hasn't
        published the exact scheme, so accept HMAC-SHA256 of the raw body in
        hex or base64, with or without a "sha256=" prefix. The webhook view
        never trusts the payload anyway: it only triggers a requery.
        """
        import base64
        secret = str(self.config.get("webhook_secret") or "").encode()
        sig = str((headers or {}).get("x-vtu-signature-256", "")).strip()
        if not secret or not sig:
            return False
        if sig.lower().startswith("sha256="):
            sig = sig[7:]
        body = payload if isinstance(payload, bytes) else str(payload).encode()
        mac = hmac.new(secret, body, hashlib.sha256)
        return (hmac.compare_digest(mac.hexdigest(), sig.lower())
                or hmac.compare_digest(base64.b64encode(mac.digest()).decode(), sig))

    def get_balance(self, currency="NGN"):
        return self.v1.get_balance(currency) if self.v1 else None

    # ---------------- helpers ----------------
    def _parse(self, resp, request_id) -> VTUResult:
        try:
            data = resp.json()
        except ValueError:
            data = {"_raw": resp.text}
        code = data.get("code")
        d = data.get("data", {}) or {}
        order_id = str(d.get("order_id", "") or request_id)

        # Duplicate -> unknown true state; keep pending and let requery resolve.
        if resp.status_code == 409 or code in ("duplicate_order", "duplicate_request_id",
                                               "duplicate_request"):
            return VTUResult(status=TxnStatus.PENDING, provider_reference=order_id, raw=data)
        # Our reseller wallet empty, or any validation error -> failed (refund user).
        if resp.status_code >= 400 or code != "success":
            return VTUResult(status=TxnStatus.FAILED, provider_reference=order_id, raw=data)
        return VTUResult(status=self._map((d.get("status") or "").lower()),
                         provider_reference=order_id, raw=data)

    @staticmethod
    def _map(status: str) -> str:
        if status == "completed-api":
            return TxnStatus.SUCCESS
        if status in ("refunded", "failed", "cancelled"):
            return TxnStatus.FAILED
        return TxnStatus.PENDING     # processing-api, queued-api, initiated-api, pending, on-hold
