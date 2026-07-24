"""
Abstract category interfaces (the API-style contracts).

One ABC per category that money/data actually flows through. Domain services
depend on these, never on concrete adapters — that is what makes providers
swappable.

NOTE on style:
  * API categories (here): payments, vtu, hotels, remittance(API mode),
    delivery(future ordering API). Adapters extend these.
  * AFFILIATE categories: flights, carhire, delivery, remittance(affiliate).
    Those adapters extend integrations.base.affiliate.AffiliateProvider instead,
    because they only build tracked links and never touch the ledger.
"""
from __future__ import annotations

import abc

from .client import BaseProviderClient
from . import dto


class PaymentGateway(BaseProviderClient):
    category = "payments"

    @abc.abstractmethod
    def initialize_charge(self, *, amount, currency, email, reference, metadata=None) -> dto.ChargeInit: ...

    @abc.abstractmethod
    def verify_charge(self, reference: str) -> dto.ChargeStatus: ...

    @abc.abstractmethod
    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        """Validate the webhook signature. MUST be called before processing."""


class VTUProvider(BaseProviderClient):
    category = "vtu"

    @abc.abstractmethod
    def purchase(self, req: dto.VTURequest) -> dto.VTUResult: ...

    @abc.abstractmethod
    def get_status(self, provider_reference: str) -> dto.StatusResult: ...


class HotelProvider(BaseProviderClient):
    category = "hotels"

    @abc.abstractmethod
    def search_hotels(self, **params) -> list[dict]: ...

    @abc.abstractmethod
    def get_availability(self, **params) -> dict: ...

    @abc.abstractmethod
    def book_hotel(self, **params) -> dto.StatusResult: ...

    @abc.abstractmethod
    def cancel_booking(self, provider_reference: str) -> dto.StatusResult: ...


class RemittanceProvider(BaseProviderClient):
    """API-mode remittance (used only once a partner grants transactional access).
    Affiliate-mode remittance lives in the affiliate adapters instead."""
    category = "remittance"

    @abc.abstractmethod
    def get_quote(self, req: dto.QuoteRequest) -> dto.QuoteResult: ...

    @abc.abstractmethod
    def create_transfer(self, req: dto.TransferRequest) -> dto.TransferResult: ...

    @abc.abstractmethod
    def get_status(self, provider_reference: str) -> dto.StatusResult: ...


class DeliveryProvider(BaseProviderClient):
    """Reserved for a future Uber Eats Ordering API (partner-gated).
    Today, food delivery is an affiliate handoff."""
    category = "delivery"

    @abc.abstractmethod
    def list_restaurants(self, **params) -> list[dict]: ...

    @abc.abstractmethod
    def create_order(self, **params) -> dto.StatusResult: ...

    @abc.abstractmethod
    def get_order_status(self, provider_reference: str) -> dto.StatusResult: ...
