#!/usr/bin/env python3
"""
Charge Marketplace/Artisan listing upgrades in the buyer's currency.

Today every upgrade is charged in NGN, so an international card (e.g. a UAE card
from Dubai) gets a "Restricted Card" error from the bank. This patch lets the
subscribe/boost endpoints charge in NGN / USD / GBP / EUR using FIXED per-
currency prices, so those cards can pay in a currency they accept.

SAFE BY DEFAULT: SUPPORTED_PAYMENT_CURRENCIES starts as just ["NGN"], so nothing
changes until you enable more — and you should only enable a currency once your
Flutterwave account is confirmed to collect it. An unsupported/unknown currency
always falls back to NGN.

WHAT IT DOES (guarded; aborts if a file has diverged):
  1. Writes apps/payments/pricing.py (per-currency price tables + resolver).
  2. Adds SUPPORTED_PAYMENT_CURRENCIES to settings.
  3. marketplace/services.py + homeservices/services.py: use the per-currency
     price instead of the NGN one.
  4. Adds GET /api/v1/payments/pricing/ so the apps can show local prices and
     know which currencies are enabled.

RUN FROM THE BACKEND ROOT:
    python3 currency_patch/apply_currency.py

Then, ONLY once Flutterwave confirms the currencies collect:
    SUPPORTED_PAYMENT_CURRENCIES=NGN,USD,GBP,EUR      (Render env)
Edit the numbers any time in apps/payments/pricing.py.
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


# ------------------------------------------------------------ 1. pricing module
PRICING = '''"""
Per-currency prices for Marketplace/Artisan listing upgrades.

Prices are FIXED per currency (not live-converted) — clean, predictable amounts
and no FX drift. Edit the numbers freely. Whether a non-NGN currency is actually
offered is gated by settings.SUPPORTED_PAYMENT_CURRENCIES, which should only list
currencies your Flutterwave account can collect.
"""
from decimal import Decimal

from django.conf import settings

# tier -> price, per currency
SUBSCRIPTION_PRICES_BY_CCY = {
    "NGN": {"premium": Decimal("2500"), "pro": Decimal("5000")},
    "USD": {"premium": Decimal("2"), "pro": Decimal("4")},
    "GBP": {"premium": Decimal("2"), "pro": Decimal("3")},
    "EUR": {"premium": Decimal("2"), "pro": Decimal("4")},
}

# boost duration (days) -> price, per currency
BOOST_PRICES_BY_CCY = {
    "NGN": {30: Decimal("2500"), 90: Decimal("5000")},
    "USD": {30: Decimal("2"), 90: Decimal("4")},
    "GBP": {30: Decimal("2"), 90: Decimal("3")},
    "EUR": {30: Decimal("2"), 90: Decimal("4")},
}


def supported_currencies():
    ccys = getattr(settings, "SUPPORTED_PAYMENT_CURRENCIES", ["NGN"]) or ["NGN"]
    out = [str(c).upper() for c in ccys if str(c).strip()]
    return out or ["NGN"]


def resolve_payment_currency(requested):
    """Return the currency to actually charge in: the requested one if it is both
    supported and priced, otherwise NGN."""
    ccy = str(requested or "NGN").upper()
    if ccy in supported_currencies() and ccy in SUBSCRIPTION_PRICES_BY_CCY:
        return ccy
    return "NGN"


def subscription_price(tier, currency):
    table = SUBSCRIPTION_PRICES_BY_CCY.get(currency, SUBSCRIPTION_PRICES_BY_CCY["NGN"])
    return table[tier]


def boost_price(days, currency):
    table = BOOST_PRICES_BY_CCY.get(currency, BOOST_PRICES_BY_CCY["NGN"])
    return table[days]


def pricing_payload():
    """Supported currencies + full price tables, for the web/mobile apps."""
    return {
        "supported_currencies": supported_currencies(),
        "subscription": {
            tier: {ccy: str(SUBSCRIPTION_PRICES_BY_CCY[ccy][tier]) for ccy in SUBSCRIPTION_PRICES_BY_CCY}
            for tier in ("premium", "pro")
        },
        "boost": {
            str(days): {ccy: str(BOOST_PRICES_BY_CCY[ccy][days]) for ccy in BOOST_PRICES_BY_CCY}
            for days in (30, 90)
        },
    }
'''
open(_p("apps", "payments", "pricing.py"), "w", encoding="utf-8").write(PRICING)
print("  + wrote apps/payments/pricing.py")

# ------------------------------------------------------------ 2. settings
edit("config/settings/base.py", [(
    "DEFAULT_PROVIDERS = {",
    'SUPPORTED_PAYMENT_CURRENCIES = [\n'
    '    c.strip().upper()\n'
    '    for c in env("SUPPORTED_PAYMENT_CURRENCIES", default="NGN").split(",")\n'
    '    if c.strip()\n'
    ']\n\n'
    "DEFAULT_PROVIDERS = {",
)])

# ------------------------------------------------------------ 3. service pricing
edit("apps/marketplace/services.py", [
    ("from integrations.base import ProviderFactory",
     "from integrations.base import ProviderFactory\nfrom apps.payments.pricing import resolve_payment_currency, subscription_price"),
    ("        price = SUBSCRIPTION_PRICES[tier]",
     "        currency = resolve_payment_currency(currency)\n        price = subscription_price(tier, currency)"),
])
edit("apps/homeservices/services.py", [
    ("from integrations.base import ProviderFactory",
     "from integrations.base import ProviderFactory\nfrom apps.payments.pricing import resolve_payment_currency, boost_price"),
    ("        price = BOOST_PACKAGES[days]",
     "        currency = resolve_payment_currency(currency)\n        price = boost_price(days, currency)"),
])

# ------------------------------------------------------------ 4. pricing endpoint
PRICING_VIEW = '''class PricingView(APIView):
    """GET /api/v1/payments/pricing/ -- supported currencies + per-currency listing
    prices, so the web/mobile apps can show local prices and only offer currencies
    that are actually enabled. Public; no money moves here."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.payments.pricing import pricing_payload
        return Response(pricing_payload())


'''
edit("apps/payments/views.py", [(
    "class DevSimulateSuccessView(APIView):",
    PRICING_VIEW + "class DevSimulateSuccessView(APIView):",
)])
edit("apps/payments/urls.py", [
    ("    PaystackWebhookView,\n)",
     "    PaystackWebhookView,\n    PricingView,\n)"),
    ('    path("webhook/paystack/", PaystackWebhookView.as_view(), name="paystack-webhook"),',
     '    path("webhook/paystack/", PaystackWebhookView.as_view(), name="paystack-webhook"),\n'
     '    path("pricing/", PricingView.as_view(), name="pricing"),'),
])

print("\nDONE. Listing upgrades can now charge in NGN/USD/GBP/EUR (fixed prices).")
print("Enable currencies only after Flutterwave confirms it collects them:")
print("    SUPPORTED_PAYMENT_CURRENCIES=NGN,USD,GBP,EUR")
