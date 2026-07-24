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

from integrations.base import register, AffiliateProvider
from integrations.base.dto import AffiliateLink

FALLBACK_URL = "https://klook.tpk.ro/5WurYtDG"

# deep-link params Klook can receive as query (advisory pass-through)
ACCEPTED_PARAMS = ["destination", "check_in", "check_out", "guests", "query"]


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
        final_url = self._append_query(url, tracking)
        return AffiliateLink(
            program="klook:hotels",
            url=final_url,
            sub_id=sub_id,
            raw={"accepts": ACCEPTED_PARAMS},
        )
