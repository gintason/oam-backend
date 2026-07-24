"""
Provider registry + factory.

Adapters decorate themselves with @register(category, key) at import time.
ProviderFactory.get(category) resolves the active adapter using
settings.DEFAULT_PROVIDERS, instantiating it with its loaded config.
"""
from __future__ import annotations

from django.conf import settings

from .exceptions import ProviderNotConfigured

# (category, key) -> adapter class
_REGISTRY: dict[tuple[str, str], type] = {}


def register(category: str, key: str):
    """Class decorator that registers a concrete adapter."""
    def _decorator(cls):
        _REGISTRY[(category, key)] = cls
        cls.provider_key = key
        cls.category = category
        return cls
    return _decorator


def _load_config(category: str, key: str) -> dict:
    """
    Resolve a provider's config/credentials.

    Looks for settings.PROVIDER_CONFIG[category][key] if present; otherwise
    returns an empty dict (adapter reads its own env vars). Kept deliberately
    simple here and expanded per-provider in later phases.
    """
    provider_config = getattr(settings, "PROVIDER_CONFIG", {})
    return provider_config.get(category, {}).get(key, {})


class ProviderFactory:
    @staticmethod
    def get(category: str, key: str | None = None):
        key = key or settings.DEFAULT_PROVIDERS.get(category, "")
        if not key:
            raise ProviderNotConfigured(
                category, f"no active provider set for category '{category}'"
            )
        cls = _REGISTRY.get((category, key))
        if cls is None:
            raise ProviderNotConfigured(
                key, f"no adapter registered for {category}:{key}"
            )
        return cls(config=_load_config(category, key))

    @staticmethod
    def registered() -> list[tuple[str, str]]:
        """All registered (category, key) pairs — handy for admin/debug."""
        return sorted(_REGISTRY.keys())
