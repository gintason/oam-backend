"""
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
