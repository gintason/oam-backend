"""
Uber Eats affiliate adapter.

Food delivery is an affiliate hand-off: we surface restaurants/promo and send
the user to Uber Eats through the affiliate link/code from your program
dashboard (Uber's affiliate program is often run via a network such as Impact/
Awin depending on region). No order or money flows through our ledger.

Credentials needed:
  - UBEREATS_AFFILIATE_URL  : base tracked URL from your affiliate dashboard
  - UBEREATS_AFFILIATE_CODE : optional code/param if your program uses one
"""
from __future__ import annotations

from integrations.base import register, AffiliateProvider
from integrations.base.dto import AffiliateLink


@register("delivery", "ubereats")
class UberEatsAffiliate(AffiliateProvider):
    base_url = "https://www.ubereats.com"

    def build_link(self, *, sub_id="", target_url="", params=None) -> AffiliateLink:
        base = self.config.get("affiliate_url") or f"{self.base_url}/"
        tracking = {"subid": sub_id}
        code = self.config.get("affiliate_code")
        if code:
            tracking["code"] = code
        if params:
            tracking.update(params)
        return AffiliateLink(
            program="ubereats",
            url=self._append_query(base, tracking),
            sub_id=sub_id,
        )
