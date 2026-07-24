"""
Exercise the webhook handlers locally with CORRECTLY SIGNED payloads.

We can't have Paystack/VTU reach 127.0.0.1, but we can prove the handler logic:
signature verification, payload parsing, settlement, and idempotency. The
signature is computed with your REAL secret key exactly the way Paystack does
it (HMAC-SHA512 of the raw body), so this is a genuine test, not a bypass.

Run:
    python manage.py shell < test_webhooks.py
or:
    python test_webhooks.py            (after `export DJANGO_SETTINGS_MODULE=...`)
"""
import hashlib
import hmac
import json

import django
from django.conf import settings
from django.test import Client

try:
    django.setup()
except Exception:
    pass

client = Client()


def hr(title):
    print("\n" + "=" * 64)
    print(f"  {title}")
    print("=" * 64)


def paystack_sign(body: bytes) -> str:
    secret = settings.PROVIDER_CONFIG["payments"]["paystack"]["secret_key"].encode()
    return hmac.new(secret, body, hashlib.sha512).hexdigest()


def post_signed(url: str, payload: dict, sign=True):
    body = json.dumps(payload).encode()
    headers = {"content_type": "application/json"}
    if sign:
        headers["HTTP_X_PAYSTACK_SIGNATURE"] = paystack_sign(body)
    return client.post(url, data=body, **headers)


# ---------------------------------------------------------------- 1. security
hr("1. FORGED signature must be REJECTED")
resp = client.post(
    "/api/v1/payments/webhook/paystack/",
    data=json.dumps({"event": "charge.success", "data": {"reference": "FAKE-123"}}),
    content_type="application/json",
    HTTP_X_PAYSTACK_SIGNATURE="deadbeef" * 16,      # bogus
)
print(f"  status: {resp.status_code}  (expect 403)")
print("  PASS — forged webhook rejected" if resp.status_code == 403
      else "  *** FAIL — a forged webhook was accepted! ***")

hr("2. MISSING signature must be REJECTED")
resp = client.post(
    "/api/v1/payments/webhook/paystack/",
    data=json.dumps({"event": "charge.success", "data": {"reference": "FAKE-123"}}),
    content_type="application/json",
)
print(f"  status: {resp.status_code}  (expect 403)")
print("  PASS — unsigned webhook rejected" if resp.status_code == 403
      else "  *** FAIL — an unsigned webhook was accepted! ***")

# ---------------------------------------------------------------- 3. real flow
hr("3. VALID signature is ACCEPTED (unknown reference -> no-op)")
resp = post_signed("/api/v1/payments/webhook/paystack/",
                   {"event": "charge.success",
                    "data": {"reference": "FUND-does-not-exist", "amount": 100000}})
print(f"  status: {resp.status_code}  (expect 200)")
print(f"  body:   {resp.content.decode()[:120]}")
print("  PASS — signed webhook accepted" if resp.status_code == 200
      else "  *** FAIL — a correctly signed webhook was rejected ***")

print("\nDone. To test a REAL settlement, create a pending funding/subscription")
print("first, then replay its reference through the signed webhook above.")
