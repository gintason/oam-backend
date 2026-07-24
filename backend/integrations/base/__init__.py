"""
Base layer for all third-party integrations.

Public surface:
    from integrations.base import ProviderFactory, register, AffiliateProvider
    from integrations.base.interfaces import PaymentGateway, VTUProvider, HotelProvider, ...
"""
from .registry import ProviderFactory, register
from .affiliate import AffiliateProvider

__all__ = ["ProviderFactory", "register", "AffiliateProvider"]
