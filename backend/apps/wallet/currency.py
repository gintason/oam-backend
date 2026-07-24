"""
Resolve a user's currency, in priority order:
  1) explicit user override (currency_override)
  2) user's saved country
  3) detection from the request (CDN country header / Accept-Language region)
  4) fallback (settings.FALLBACK_CURRENCY, = USD)

Only currencies in settings.SUPPORTED_CURRENCIES are ever returned.
"""
from __future__ import annotations

import re

from django.conf import settings

# Eurozone members -> EUR
_EUROZONE = {
    "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT",
    "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
}
_COUNTRY_CURRENCY = {"NG": "NGN", "US": "USD", "GB": "GBP"}

# Headers a CDN/proxy may set with the visitor's country (best-effort).
_COUNTRY_HEADERS = ("HTTP_CF_IPCOUNTRY", "HTTP_X_APPENGINE_COUNTRY", "HTTP_X_COUNTRY")


def currency_for_country(code: str | None) -> str | None:
    if not code:
        return None
    code = code.upper()
    if code in _COUNTRY_CURRENCY:
        return _COUNTRY_CURRENCY[code]
    if code in _EUROZONE:
        return "EUR"
    return None


def _from_request(request) -> str | None:
    if request is None:
        return None
    for header in _COUNTRY_HEADERS:
        country = request.META.get(header)
        if country and country.upper() not in ("XX", "ZZ"):
            cur = currency_for_country(country)
            if cur:
                return cur
    # e.g. "en-US,en;q=0.9" -> region "US"
    match = re.search(r"[A-Za-z]{2,3}-([A-Za-z]{2})", request.META.get("HTTP_ACCEPT_LANGUAGE", ""))
    if match:
        return currency_for_country(match.group(1))
    return None


def resolve_currency(user=None, request=None) -> tuple[str, str]:
    """Returns (currency, source) where source explains how it was chosen."""
    supported = set(settings.SUPPORTED_CURRENCIES)

    override = getattr(user, "currency_override", "") if user else ""
    if override and override.upper() in supported:
        return override.upper(), "override"

    country = getattr(user, "country", "") if user else ""
    cur = currency_for_country(country)
    if cur in supported:
        return cur, "country"

    cur = _from_request(request)
    if cur in supported:
        return cur, "detected"

    return getattr(settings, "FALLBACK_CURRENCY", "USD"), "fallback"
