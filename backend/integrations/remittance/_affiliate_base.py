"""
Shared base for money-transfer AFFILIATE adapters (Wise, Lemfi, Remitly, Taptap).

These send the user to the partner to complete the transfer and we earn
referral commission. Nothing posts to our ledger. If/when a partner grants
transactional API access, add a separate API adapter (subclassing
integrations.base.interfaces.RemittanceProvider) under a key like "<name>_api".

Each provider only needs an affiliate base URL from its program dashboard.
Optionally we pass corridor hints (source/target currency, amount) as query
params so the partner pre-fills the calculator where supported.
"""
from __future__ import annotations

from integrations.base import AffiliateProvider
from integrations.base.dto import AffiliateLink


class RemittanceAffiliateBase(AffiliateProvider):
    category = "remittance"
    program_name = "remittance"
    fallback_url = "https://example.com/"

    def build_link(self, *, sub_id="", target_url="", params=None) -> AffiliateLink:
        base = self.config.get("affiliate_url") or target_url or self.fallback_url
        tracking = {"sub_id": sub_id}
        # Optional corridor pre-fill (only used by partners that accept them).
        if params:
            for key in ("source_currency", "target_currency", "amount"):
                if params.get(key):
                    tracking[key] = params[key]
        return AffiliateLink(
            program=f"{self.program_name}",
            url=self._append_query(base, tracking),
            sub_id=sub_id,
        )
