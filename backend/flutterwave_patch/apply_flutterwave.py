#!/usr/bin/env python3
"""
Route Marketplace + Artisan listing-upgrade payments (Pro/Premium tiers and
artisan boosts) through Flutterwave instead of Paystack. Everything else —
wallet funding, bills, payouts — stays on the default gateway.

WHAT IT DOES (all edits are guarded; the script aborts if a file has diverged
from what it expects, so it never silently corrupts anything):
  1. Writes the Flutterwave adapter: integrations/payments/flutterwave/adapter.py
  2. Registers it in integrations/loader.py
  3. Extends config/settings/base.py: flutterwave config + FLUTTERWAVE_REDIRECT_URL
     + LISTING_UPGRADE_PROVIDER
  4. Routes marketplace + homeservices initiate() to the upgrade provider and
     verify() to each payment's stored provider
  5. Makes the two upgrade webhook endpoints provider-aware (accept Flutterwave's
     verif-hash + charge.completed payload) and adds /webhook/flutterwave/ aliases

RUN FROM THE BACKEND ROOT (the folder with manage.py):
    python3 flutterwave_patch/apply_flutterwave.py

Then set these env vars (Render dashboard) and run migrations if any:
    FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_PUBLIC_KEY, FLUTTERWAVE_SECRET_HASH
    FLUTTERWAVE_REDIRECT_URL   (defaults to PAYSTACK_CALLBACK_URL)
    LISTING_UPGRADE_PROVIDER   (defaults to "flutterwave"; set "paystack" to revert)
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


def edit(path, subs, *, must_exist=True):
    full = _p(path)
    if not os.path.exists(full):
        if must_exist:
            sys.exit(f"ABORT: expected file not found: {path}")
        return
    s = open(full, encoding="utf-8").read()
    for old, new in subs:
        if new in s:
            print(f"  = {path}: already applied, skipping one edit")
            continue
        if s.count(old) != 1:
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:160]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


# ---------------------------------------------------------------- 1. adapter
ADAPTER = r'''"""
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
'''

pkg = _p("integrations", "payments", "flutterwave")
os.makedirs(pkg, exist_ok=True)
open(os.path.join(pkg, "__init__.py"), "w").close()
open(os.path.join(pkg, "adapter.py"), "w", encoding="utf-8").write(ADAPTER)
print("  + wrote integrations/payments/flutterwave/adapter.py")

# ---------------------------------------------------------------- 2. loader
edit("integrations/loader.py", [(
    '    "integrations.payments.paystack.adapter",\n',
    '    "integrations.payments.paystack.adapter",\n'
    '    "integrations.payments.flutterwave.adapter",\n',
)])

# ---------------------------------------------------------------- 3. settings
edit("config/settings/base.py", [
    (
        '        "flutterwave": {"secret_key": env("FLUTTERWAVE_SECRET_KEY", default="")},',
        '        "flutterwave": {"secret_key": env("FLUTTERWAVE_SECRET_KEY", default=""),\n'
        '                        "public_key": env("FLUTTERWAVE_PUBLIC_KEY", default=""),\n'
        '                        "secret_hash": env("FLUTTERWAVE_SECRET_HASH", default=""),\n'
        '                        "redirect_url": env("FLUTTERWAVE_REDIRECT_URL", default="")},',
    ),
    (
        'PAYSTACK_CALLBACK_URL = env("PAYSTACK_CALLBACK_URL", default="")',
        'PAYSTACK_CALLBACK_URL = env("PAYSTACK_CALLBACK_URL", default="")\n'
        'FLUTTERWAVE_REDIRECT_URL = env("FLUTTERWAVE_REDIRECT_URL", default=PAYSTACK_CALLBACK_URL)\n'
        '\n'
        '# Gateway used ONLY for Marketplace/Artisan listing-upgrade payments (Pro/\n'
        '# Premium seller tiers and artisan boosts). Everything else uses\n'
        '# DEFAULT_PROVIDERS["payments"]. Set to "paystack" to revert.\n'
        'LISTING_UPGRADE_PROVIDER = env("LISTING_UPGRADE_PROVIDER", default="flutterwave")',
    ),
])

# ---------------------------------------------------------------- 4. routing
for svc in ("apps/marketplace/services.py", "apps/homeservices/services.py"):
    edit(svc, [
        ('from integrations.base import ProviderFactory',
         'from django.conf import settings\nfrom integrations.base import ProviderFactory'),
        ('        gateway = ProviderFactory.get("payments")\n        try:\n            init = gateway.initialize_charge(',
         '        gateway = ProviderFactory.get("payments", settings.LISTING_UPGRADE_PROVIDER)\n        try:\n            init = gateway.initialize_charge('),
        ('        gateway = ProviderFactory.get("payments")\n        try:\n            status = gateway.verify_charge(reference)',
         '        gateway = ProviderFactory.get("payments", payment.provider or None)\n        try:\n            status = gateway.verify_charge(reference)'),
    ])

# ------------------------------------------------- 5. provider-aware webhooks
WEBHOOK_HEAD_OLD = (
    '        from integrations.base import ProviderFactory\n'
    '        gateway = ProviderFactory.get("payments")\n'
    '        headers = {k.lower(): v for k, v in request.headers.items()}\n'
)
WEBHOOK_HEAD_NEW = (
    '        from django.conf import settings\n'
    '        from integrations.base import ProviderFactory\n'
    '        headers = {k.lower(): v for k, v in request.headers.items()}\n'
    '        provider = ("flutterwave" if headers.get("verif-hash")\n'
    '                    else settings.DEFAULT_PROVIDERS.get("payments", "paystack"))\n'
    '        gateway = ProviderFactory.get("payments", provider)\n'
)

edit("apps/marketplace/views.py", [
    (WEBHOOK_HEAD_OLD, WEBHOOK_HEAD_NEW),
    (
        '        event = payload.get("event", "")\n'
        '        data = payload.get("data", {}) or {}\n'
        '        reference = data.get("reference", "")\n'
        '        if event == "charge.success" and reference:\n'
        '            MarketplaceService.activate_by_reference(reference)',
        '        event = payload.get("event", "")\n'
        '        data = payload.get("data", {}) or {}\n'
        '        reference = data.get("reference") or data.get("tx_ref") or ""\n'
        '        ok = (event == "charge.success") or (\n'
        '            event == "charge.completed"\n'
        '            and str(data.get("status", "")).lower() == "successful")\n'
        '        if ok and reference:\n'
        '            MarketplaceService.activate_by_reference(reference)',
    ),
])

edit("apps/homeservices/views.py", [
    (WEBHOOK_HEAD_OLD, WEBHOOK_HEAD_NEW),
    (
        '        data = payload.get("data", {}) or {}\n'
        '        reference = data.get("reference", "")\n'
        '        if payload.get("event") == "charge.success" and reference.startswith("BOOST-"):\n'
        '            HomeServiceService.activate_by_reference(reference)',
        '        data = payload.get("data", {}) or {}\n'
        '        reference = data.get("reference") or data.get("tx_ref") or ""\n'
        '        event = payload.get("event", "")\n'
        '        ok = (event == "charge.success") or (\n'
        '            event == "charge.completed"\n'
        '            and str(data.get("status", "")).lower() == "successful")\n'
        '        if ok and reference.startswith("BOOST-"):\n'
        '            HomeServiceService.activate_by_reference(reference)',
    ),
])

# ---------------------------------------------------------------- 6. url aliases
edit("apps/marketplace/urls.py", [(
    '    path("subscription/webhook/paystack/", SubscriptionWebhookView.as_view(), name="mkt-subscribe-webhook"),',
    '    path("subscription/webhook/paystack/", SubscriptionWebhookView.as_view(), name="mkt-subscribe-webhook"),\n'
    '    path("subscription/webhook/flutterwave/", SubscriptionWebhookView.as_view(), name="mkt-subscribe-webhook-flw"),',
)])
edit("apps/homeservices/urls.py", [(
    '    path("artisans/boost/webhook/paystack/", BoostWebhookView.as_view(), name="hs-boost-webhook"),',
    '    path("artisans/boost/webhook/paystack/", BoostWebhookView.as_view(), name="hs-boost-webhook"),\n'
    '    path("artisans/boost/webhook/flutterwave/", BoostWebhookView.as_view(), name="hs-boost-webhook-flw"),',
)])

print("\nDONE. Flutterwave routing applied.")
print("Point your Flutterwave dashboard webhooks at:")
print("    <API_BASE>/api/v1/marketplace/subscription/webhook/flutterwave/")
print("    <API_BASE>/api/v1/artisans/boost/webhook/flutterwave/")
