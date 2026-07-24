"""
Base class for AFFILIATE integrations.

Affiliate providers do NOT move money or create bookings on our ledger. They
generate a tracked deep link (and sometimes an embeddable widget), hand the
user off to the partner, and we earn commission on resulting conversions.

Because nothing posts to the ledger, the contract is small: build a tracked
link. Attribution (recording the click, generating the sub_id) is handled by
apps.affiliates.services.AffiliateService, which calls build_link().
"""
from __future__ import annotations

import abc
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

from .client import BaseProviderClient
from .dto import AffiliateLink


class AffiliateProvider(BaseProviderClient):
    mode = "affiliate"

    @abc.abstractmethod
    def build_link(self, *, sub_id: str = "", target_url: str = "",
                   params: dict | None = None) -> AffiliateLink:
        """Return a tracked AffiliateLink for this program."""

    # -- shared helpers for subclasses --------------------------------
    @staticmethod
    def _append_query(url: str, extra: dict) -> str:
        """Merge `extra` query params into an existing URL, preserving any present."""
        parsed = urlparse(url)
        query = dict(parse_qsl(parsed.query))
        query.update({k: v for k, v in extra.items() if v not in (None, "")})
        return urlunparse(parsed._replace(query=urlencode(query)))
