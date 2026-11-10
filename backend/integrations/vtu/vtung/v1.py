"""
VTU.ng Partner API v1 (https://api.vtu.ng/v1) — the new key-based API.

Used automatically when VTU_NG_SECRET_KEY is set; otherwise the legacy
username/password adapter keeps working, so deploying this changes nothing
until the key is added.

Reference: docs/vtung-partner-api.md (from https://vtu.ng/docs/api.json).

KEY POINTS
  * Auth: `Authorization: Bearer vtu_sk_live_...` (secret key, server-side only).
  * Every purchase needs an `Idempotency-Key` header. We send OUR order
    reference, so a retry never double-charges and we can requery by it:
    GET /transactions/<our ref>?type=bill_payment.
  * Purchases are async: 201 + status "processing", later completed / failed /
    refunded / cancelled.
  * Amounts are in naira (major units).

COMPATIBILITY
  Billing code reads provider payloads in the legacy shape
  (data.status, data.customer_name, data.token, data.units). `_legacy_raw()`
  returns that shape and keeps the untouched v1 body under "v1".
"""
from __future__ import annotations

import requests

from integrations.base.dto import StatusResult, TxnStatus, VTUResult
from integrations.base.exceptions import (
    ProviderAuthError,
    ProviderError,
    ProviderTimeout,
    ProviderUnavailable,
    ProviderValidationError,
)

LIVE_BASE = "https://api.vtu.ng/v1"
TIMEOUT = (5, 60)

# Our biller codes (seed_billers / seed_betting_billers) -> v1 slugs.
NETWORKS = {"mtn": "mtn", "glo": "glo", "airtel": "airtel",
            "9mobile": "t2mobile", "etisalat": "t2mobile", "t2mobile": "t2mobile",
            "smile": "smile"}
DISCOS = {
    "ikeja-electric": "ikedc", "eko-electric": "ekedc", "kano-electric": "kedco",
    "portharcourt-electric": "phed", "jos-electric": "jed", "ibadan-electric": "ibedc",
    "kaduna-electric": "kaedco", "abuja-electric": "aedc", "enugu-electric": "eedc",
    "benin-electric": "bedc", "aba-electric": "abedc", "yola-electric": "yedc",
}
DISCO_SLUGS = set(DISCOS.values())
CABLE = {"dstv", "gotv", "startimes"}

_SUCCESS = {"completed"}
_FAILED = {"failed", "refunded", "cancelled"}


def network_slug(code: str) -> str:
    return NETWORKS.get(str(code or "").strip().lower(), str(code or "").strip().lower())


def disco_slug(code: str) -> str:
    c = str(code or "").strip().lower()
    return DISCOS.get(c, c)


def betting_slug(code: str) -> str:
    # "1xBet" -> "1xbet", "LiveScoreBet" -> "livescorebet"
    return str(code or "").strip().lower().replace(" ", "")


def map_status(value: str) -> str:
    v = str(value or "").lower()
    if v in _SUCCESS:
        return TxnStatus.SUCCESS
    if v in _FAILED:
        return TxnStatus.FAILED
    return TxnStatus.PENDING                      # pending / processing / unknown


def _txn_from(body: dict) -> dict:
    """The transaction object from a purchase (transaction) or lookup (data) body."""
    if not isinstance(body, dict):
        return {}
    t = body.get("transaction") or body.get("data") or {}
    return t if isinstance(t, dict) else {}


def _status_value(txn: dict) -> str:
    st = txn.get("status")
    if isinstance(st, dict):
        return str(st.get("value") or "")
    return str(st or "")


def _legacy_raw(body: dict) -> dict:
    """Present a v1 body in the shape billing code already reads."""
    txn = _txn_from(body)
    meta = txn.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    data = {
        "status": _status_value(txn),
        "order_id": txn.get("reference") or "",
        "customer_name": meta.get("customer_name") or meta.get("account_name") or "",
        "token": meta.get("electricity_token") or meta.get("token") or "",
        "units": meta.get("electricity_units") or meta.get("units") or "",
        "failure_reason": txn.get("failure_reason") or "",
    }
    return {"data": {k: v for k, v in data.items() if v not in (None, "")},
            "message": body.get("message", "") if isinstance(body, dict) else "",
            "v1": body}


class VtuNgV1:
    def __init__(self, config: dict):
        self.secret_key = str(config.get("secret_key") or "").strip()
        self.base = str(config.get("base_url") or LIVE_BASE).rstrip("/")

    # ---------------- http ----------------
    def _headers(self, idempotency_key: str | None = None) -> dict:
        h = {"Authorization": f"Bearer {self.secret_key}",
             "Accept": "application/json", "Content-Type": "application/json"}
        if idempotency_key:
            h["Idempotency-Key"] = idempotency_key[:128]
        return h

    def _call(self, method: str, path: str, *, json=None, params=None, idem=None):
        try:
            resp = requests.request(method, f"{self.base}{path}", json=json, params=params,
                                    headers=self._headers(idem), timeout=TIMEOUT)
        except requests.Timeout as exc:
            raise ProviderTimeout("vtung", f"{path} timeout") from exc
        except requests.RequestException as exc:
            raise ProviderUnavailable("vtung", str(exc)) from exc
        try:
            body = resp.json() if resp.content else {}
        except ValueError:
            body = {"_raw": resp.text[:500]}
        if resp.status_code == 401:
            raise ProviderAuthError("vtung", _error_message(body) or "authentication failed", raw=body)
        return resp.status_code, body

    # ---------------- purchase ----------------
    def purchase(self, req) -> VTUResult:
        ref = (getattr(req, "request_id", "") or "")[:128]
        svc = req.service
        if svc == "airtime":
            path, payload = "/bills/airtime", {
                "phone": req.recipient, "network": network_slug(req.operator),
                "amount": int(req.amount)}
        elif svc == "data":
            path, payload = "/bills/data", {
                "phone": req.recipient, "network": network_slug(req.operator),
                "variation_code": req.plan_code}
        elif svc == "cable":
            prov = str(req.operator).lower()
            if prov not in CABLE:                 # e.g. Showmax: not sold on v1 -> refund
                return VTUResult(status=TxnStatus.FAILED, provider_reference="",
                                 raw={"data": {"status": "failed"},
                                      "message": f"{req.operator} is not available."})
            path, payload = "/bills/cable-tv", {
                "provider": prov, "smartcard_number": req.recipient,
                "subscription_type": "change", "variation_code": req.plan_code}
        elif svc == "electricity":
            path, payload = "/bills/electricity", {
                "disco_slug": disco_slug(req.operator), "meter_number": req.recipient,
                "meter_type": (req.plan_code or "prepaid").lower(), "amount": int(req.amount)}
        elif svc == "betting":
            path, payload = "/bills/bet-funding", {
                "provider": betting_slug(req.operator), "account_id": req.recipient,
                "amount": int(req.amount)}
        else:
            raise ProviderValidationError("vtung", f"service '{svc}' not integrated yet")

        try:
            code, body = self._call("POST", path, json=payload, idem=ref)
        except ProviderAuthError as exc:          # key rejected: nothing was bought -> refund
            return VTUResult(status=TxnStatus.FAILED, provider_reference="",
                             raw={"data": {"status": "failed"}, "message": str(exc),
                                  "v1": getattr(exc, "raw", None)})
        txn = _txn_from(body)
        vtu_ref = str(txn.get("reference") or "")
        raw = _legacy_raw(body)

        if code == 409:                           # same key still in flight -> wait
            return VTUResult(status=TxnStatus.PENDING, provider_reference=vtu_ref, raw=raw)
        if code >= 500:                           # unknown outcome -> requery decides
            return VTUResult(status=TxnStatus.PENDING, provider_reference=vtu_ref, raw=raw)
        if code >= 400 or not txn:                # validation / insufficient_funds / auth
            return VTUResult(status=TxnStatus.FAILED, provider_reference=vtu_ref, raw=raw)
        return VTUResult(status=map_status(_status_value(txn)), provider_reference=vtu_ref, raw=raw)

    # ---------------- requery ----------------
    def get_status(self, our_reference: str) -> StatusResult:
        """Look up by OUR reference (sent as Idempotency-Key); VTU falls back to it."""
        code, body = self._call("GET", f"/transactions/{our_reference}",
                                params={"type": "bill_payment"})
        if code == 404:
            # Not (yet) on VTU's side. Don't settle anything: poll() leaves it as-is.
            raise ProviderError("vtung", "transaction not found", raw=body)
        if code >= 400:
            raise ProviderError("vtung", _error_message(body) or f"requery failed ({code})", raw=body)
        txn = _txn_from(body)
        return StatusResult(status=map_status(_status_value(txn)),
                            provider_reference=str(txn.get("reference") or ""),
                            raw=_legacy_raw(body))

    # ---------------- catalog ----------------
    def list_variations(self, category, operator):
        if category == "data":
            code, body = self._call("GET", "/bills/data-plans",
                                    params={"network": network_slug(operator)})
        elif category == "cable":
            prov = str(operator).lower()
            if prov not in CABLE:
                return []
            code, body = self._call("GET", "/bills/cable-packages", params={"provider": prov})
        else:
            return []
        if code >= 400:
            return []
        out = []
        for v in (body.get("data") or []) if isinstance(body, dict) else []:
            vc = str(v.get("variation_code") or "")
            if not vc:
                continue
            out.append({
                "variation_id": vc,
                "name": v.get("name") or "",
                "price": str(v.get("amount") if v.get("amount") is not None else ""),
                "reseller_price": "",            # v1 returns a single price
                "validity": v.get("validity") or "",
            })
        return out

    # ---------------- verification ----------------
    def verify_customer(self, service_id, customer_id, variation=None):
        sid = str(service_id or "").strip()
        low = sid.lower()
        if low in CABLE:
            code, body = self._call("POST", "/bills/cable-tv/verify-smartcard",
                                    json={"provider": low, "smartcard_number": str(customer_id)})
            v = (body.get("verification") if isinstance(body, dict) else None) or {}
            details = {**v, "customer_name": v.get("customer_name")}
        elif low in DISCOS or low in DISCO_SLUGS:
            code, body = self._call("POST", "/bills/electricity/verify-meter",
                                    json={"disco_slug": disco_slug(low), "meter_number": str(customer_id),
                                          "meter_type": str(variation or "prepaid").lower()})
            v = (body.get("verification") if isinstance(body, dict) else None) or {}
            details = {**v, "customer_name": v.get("customer_name"),
                       "min_purchase_amount": v.get("minimum_purchase_amount")}
        else:                                      # betting provider
            code, body = self._call("POST", "/bills/bet-funding/verify-account",
                                    json={"provider": betting_slug(sid), "account_id": str(customer_id)})
            v = (body.get("validation") if isinstance(body, dict) else None) or {}
            details = {**v, "customer_name": v.get("name") or v.get("account_name"),
                       "min_purchase_amount": v.get("min_payable_amount")}
        if code >= 400 or not details.get("customer_name"):
            raise ProviderValidationError("vtung", _error_message(body) or "Verification failed")
        return {k: val for k, val in details.items() if val is not None}

    # ---------------- balance ----------------
    def get_balance(self, currency="NGN"):
        code, body = self._call("GET", "/wallet")
        if code >= 400:
            return None
        for w in (body.get("data") or []) if isinstance(body, dict) else []:
            if str(w.get("currency", "")).upper() == currency.upper():
                return w.get("balance")
        return None


def _error_message(body) -> str:
    if not isinstance(body, dict):
        return ""
    err = body.get("error")
    if isinstance(err, dict):
        return str(err.get("message") or err.get("code") or "")
    return str(body.get("message") or "")
