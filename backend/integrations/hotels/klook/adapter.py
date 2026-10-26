"""
Klook affiliate adapter (via Travelpayouts) — registered under the `hotels`
category as an AFFILIATE provider (hand-off link, not the Hotelbeds API).

Klook covers hotels, tours, activities, attraction tickets and transfers; the
reflink already carries your marker. We append `sub_id` for attribution and map
optional search params (destination, dates) into the link.

Config (settings.PROVIDER_CONFIG["hotels"]["klook"]):
  - url : your Klook affiliate link (from .env)
"""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from integrations.base import register, AffiliateProvider
from integrations.base.dto import AffiliateLink
from integrations.base.affiliate_links import sanitize_affiliate_url

# Legacy short-link kept only for reference; it is a tpk.ro domain and is
# sanitized away before it can ever reach a browser. Configure KLOOK_URL with a
# clean canonical link (tp.media / direct) to preserve attribution.
FALLBACK_URL = "https://klook.tpk.ro/5WurYtDG"

# deep-link params Klook can receive as query (advisory pass-through)
ACCEPTED_PARAMS = ["destination", "check_in", "check_out", "guests", "query"]

DEFAULT_LANDING = "https://www.klook.com/en-US/hotels/"


def with_landing(url: str, landing: str) -> str:
    """Make sure a Klook/Travelpayouts redirect link names where it should land.

    Klook's redirect page (affiliate.klook.com/redirect) and Travelpayouts'
    click link (tp.media/r) send the visitor to the URL in `k_site` / `u`.
    When that is missing or "null", Klook picks a page by the visitor's country
    and, for many countries, ends on "null is unreachable". Setting it
    explicitly makes the link open the same page everywhere.
    """
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    key = ("k_site" if host.endswith("affiliate.klook.com")
           else "u" if host.endswith("tp.media") or host.endswith("travelpayouts.com") else "")
    if not key:
        return url
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if str(query.get(key, "")).strip().lower() in ("", "null", "undefined", "none"):
        query[key] = landing
    return urlunparse(parsed._replace(query=urlencode(query)))


@register("hotels", "klook")
class KlookHotels(AffiliateProvider):
    base_url = "https://www.klook.com"
    category = "hotels"

    def _program_link(self) -> str:
        return self.config.get("url") or FALLBACK_URL

    def build_link(self, *, sub_id="", target_url="", params=None) -> AffiliateLink:
        url = target_url or self._program_link()
        tracking = {"sub_id": sub_id}
        if params:
            tracking.update({k: v for k, v in params.items()
                             if k in ACCEPTED_PARAMS and v not in (None, "")})
        # Never expose a blocked tpk.ro host to the browser.
        url = sanitize_affiliate_url(url, self.category)
        url = with_landing(url, self.config.get("landing_url") or DEFAULT_LANDING)
        final_url = self._append_query(url, tracking)
        return AffiliateLink(
            program="klook:hotels",
            url=final_url,
            sub_id=sub_id,
            raw={"accepts": ACCEPTED_PARAMS},
        )
