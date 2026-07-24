"""
G2A gift-card / digital-goods affiliate adapter.

G2A is a marketplace affiliate program: we send users to G2A through a reflink
that carries your affiliate id. We append `sub_id` for per-click attribution and
map optional search params (e.g. a product query) into the link.

Config (settings.PROVIDER_CONFIG["giftcards"]["g2a"]):
  - url : your G2A reflink (from .env)
"""
from __future__ import annotations

from integrations.base import register, AffiliateProvider
from integrations.base.dto import AffiliateLink

FALLBACK_URL = "https://www.g2a.com/n/reflink-c49af69f49"

# deep-link params G2A understands (search query, category)
ACCEPTED_PARAMS = ["query", "category"]


@register("giftcards", "g2a")
class G2AGiftcards(AffiliateProvider):
    base_url = "https://www.g2a.com"
    category = "giftcards"

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
            program="g2a:giftcards",
            url=final_url,
            sub_id=sub_id,
            raw={"accepts": ACCEPTED_PARAMS},
        )
