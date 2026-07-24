"""
Travelpayouts affiliate adapter.

Travelpayouts is an affiliate NETWORK: monetisation happens by sending users to
partner sites through a tracked link. The same account/marker covers several
programs, so this one adapter is registered under multiple categories
(flights, carhire, transfers).

Each program has a ready affiliate short-link (from the Travelpayouts dashboard)
that already carries your marker. We use it as the base and append `sub_id` for
per-click attribution, plus any deep-link search params the user supplied.

Config (settings.PROVIDER_CONFIG[<category>]["travelpayouts"]):
  - marker : your Travelpayouts affiliate marker (optional; short-link carries it)
  - token  : API token (only for live data/widgets, not needed for links)
  - url    : the program's affiliate link (from .env)
"""
from __future__ import annotations

from integrations.base import register, AffiliateProvider
from integrations.base.dto import AffiliateLink

# Fallback affiliate links per program (overridden by PROVIDER_CONFIG url).
PROGRAM_LINKS = {
    "flights": "https://aviasales.tpk.ro/Lwo3RBGg",
    "carhire": "https://getrentacar.tpk.ro/BpxjbW3V",
    "transfers": "https://tpk.ro/2VAJWYaW",
}

# Which deep-link params each program accepts (advisory: passed through as query).
PROGRAM_PARAMS = {
    "flights": ["origin", "destination", "depart_date", "return_date", "adults"],
    "carhire": ["location", "pickup_date", "dropoff_date"],
    "transfers": ["airport", "destination", "date", "passengers"],
}


class _TravelpayoutsBase(AffiliateProvider):
    base_url = "https://api.travelpayouts.com"

    def _marker(self) -> str:
        return self.config.get("marker", "")

    def _program_link(self) -> str:
        # prefer the configured affiliate URL, else the built-in fallback
        return self.config.get("url") or PROGRAM_LINKS.get(self.category, "")

    def build_link(self, *, sub_id="", target_url="", params=None) -> AffiliateLink:
        program = self.category
        url = target_url or self._program_link()
        tracking = {"sub_id": sub_id}
        marker = self._marker()
        if marker:
            tracking["marker"] = marker
        # append only the params this program understands
        allowed = set(PROGRAM_PARAMS.get(program, []))
        if params:
            tracking.update({k: v for k, v in params.items()
                             if k in allowed and v not in (None, "")})
        final_url = self._append_query(url, tracking)
        return AffiliateLink(
            program=f"travelpayouts:{program}",
            url=final_url,
            sub_id=sub_id,
            raw={"marker": marker, "accepts": PROGRAM_PARAMS.get(program, [])},
        )


@register("flights", "travelpayouts")
class TravelpayoutsFlights(_TravelpayoutsBase):
    pass


@register("carhire", "travelpayouts")
class TravelpayoutsCarHire(_TravelpayoutsBase):
    pass


@register("transfers", "travelpayouts")
class TravelpayoutsTransfers(_TravelpayoutsBase):
    pass
