"""
Hotelbeds (APITUDE) hotel booking adapter skeleton — an API integration.

Hotelbeds authenticates each request with an X-Signature header:
    signature = SHA256(api_key + secret + unix_timestamp)
sent alongside the Api-key header. We compute it per request below; the actual
search/availability/booking payloads get wired in during the Hotel phase.

Credentials (Hotelbeds dashboard):
  - HOTELBEDS_API_KEY, HOTELBEDS_SECRET, HOTELBEDS_BASE_URL
"""
from __future__ import annotations

import hashlib
import time

from integrations.base import register
from integrations.base.interfaces import HotelProvider
from integrations.base.dto import StatusResult


@register("hotels", "hotelbeds")
class HotelbedsAdapter(HotelProvider):
    @property
    def base_url(self) -> str:                      # type: ignore[override]
        return self.config.get("base_url", "https://api.test.hotelbeds.com")

    def _signature(self) -> str:
        api_key = self.config.get("api_key", "")
        secret = self.config.get("secret", "")
        raw = f"{api_key}{secret}{int(time.time())}".encode()
        return hashlib.sha256(raw).hexdigest()

    def _headers(self) -> dict:
        return {
            "Accept": "application/json",
            "Api-key": self.config.get("api_key", ""),
            "X-Signature": self._signature(),
        }

    def search_hotels(self, **params) -> list[dict]:
        raise NotImplementedError("Wire Hotelbeds hotel search in the Hotel phase.")

    def get_availability(self, **params) -> dict:
        raise NotImplementedError("Wire Hotelbeds availability in the Hotel phase.")

    def book_hotel(self, **params) -> StatusResult:
        raise NotImplementedError("Wire Hotelbeds booking in the Hotel phase.")

    def cancel_booking(self, provider_reference: str) -> StatusResult:
        raise NotImplementedError("Wire Hotelbeds cancellation in the Hotel phase.")
