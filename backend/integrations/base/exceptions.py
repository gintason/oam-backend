"""Normalised exceptions. Adapters translate provider-specific errors into these
so the domain layer handles failures uniformly, regardless of provider."""


class ProviderError(Exception):
    """Base class for any third-party integration failure."""
    def __init__(self, provider: str, message: str = "", *, raw=None):
        self.provider = provider
        self.raw = raw
        super().__init__(f"[{provider}] {message}")


class ProviderTimeout(ProviderError):
    """The provider did not respond in time. Safe to retry."""


class ProviderAuthError(ProviderError):
    """Credentials rejected / expired. Not retryable without re-auth."""


class ProviderValidationError(ProviderError):
    """The provider rejected the request payload (4xx). Not retryable as-is."""


class ProviderUnavailable(ProviderError):
    """Provider returned 5xx / is down. Retryable with backoff."""


class ProviderNotConfigured(ProviderError):
    """No adapter registered for the requested category/key."""
