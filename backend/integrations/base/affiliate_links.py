"""
Affiliate link hygiene.

`*.tpk.ro` is a legacy Travelpayouts short-link domain that is frequently
blocked by international ISPs, corporate/private DNS and ad-blockers — clicking
one yields "this site can't be reached". We must never hand a raw tpk.ro URL to
a user's browser.

`sanitize_affiliate_url` guarantees the returned URL is on a clean, globally
reachable host: if the URL is empty or points at a tpk.ro host, it is replaced
with the direct partner site for that category. That keeps the experience
working everywhere; attribution is only preserved when a clean affiliate URL is
configured, so paste your canonical dashboard links into the env vars to keep
tracking:

    KLOOK_URL, TRAVELPAYOUTS_FLIGHTS_URL, TRAVELPAYOUTS_CARHIRE_URL,
    TRAVELPAYOUTS_TRANSFERS_URL

A canonical Travelpayouts link uses the `tp.media` click domain (not tpk.ro).
"""
from __future__ import annotations

from urllib.parse import urlparse

# Blocked / unreliable short-link hosts we must never expose to the browser.
BLOCKED_HOSTS = ("tpk.ro",)

# Clean, globally reachable destinations per category, used only when we have
# no clean affiliate URL to send the user to.
DIRECT_FALLBACKS = {
    "hotels": "https://www.klook.com/",
    "flights": "https://www.aviasales.com/",
    "carhire": "https://www.getrentacar.com/",
    "transfers": "https://www.kiwitaxi.com/",
}

DEFAULT_FALLBACK = "https://www.klook.com/"


def _host_is_blocked(host: str) -> bool:
    host = (host or "").lower()
    return any(host == b or host.endswith("." + b) for b in BLOCKED_HOSTS)


def is_blocked_url(url: str) -> bool:
    """True if the URL is empty or points at a blocked short-link host."""
    if not url:
        return True
    try:
        return _host_is_blocked(urlparse(url).netloc)
    except ValueError:
        return True


def sanitize_affiliate_url(url: str, category: str = "") -> str:
    """Return a browser-safe URL, swapping blocked hosts for a clean fallback."""
    if not is_blocked_url(url):
        return url
    return DIRECT_FALLBACKS.get(category, DEFAULT_FALLBACK)
