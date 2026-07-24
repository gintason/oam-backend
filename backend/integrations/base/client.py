"""
Shared HTTP client every adapter inherits.

Centralises: a connection-pooled session, automatic retries with backoff on
transient failures, sane timeouts, and translation of low-level HTTP errors
into our normalised ProviderError hierarchy. Adapters only implement the
provider-specific request shaping and response parsing.
"""
from __future__ import annotations

import abc
import logging

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .exceptions import (
    ProviderAuthError,
    ProviderError,
    ProviderTimeout,
    ProviderUnavailable,
    ProviderValidationError,
)

logger = logging.getLogger("integrations")

DEFAULT_TIMEOUT = (5, 30)  # (connect, read) seconds


def _build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.5,                       # 0.5s, 1s, 2s
        status_forcelist=(502, 503, 504),
        allowed_methods=("GET", "POST", "PUT", "PATCH", "DELETE"),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


class BaseProviderClient(abc.ABC):
    """Abstract HTTP base. Subclasses set `provider_key`, `category`, `base_url`."""

    provider_key: str = ""
    category: str = ""
    base_url: str = ""

    def __init__(self, config: dict | None = None):
        self.config = config or {}
        self.session = _build_session()

    # -- helpers --------------------------------------------------------
    def _url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"

    def _headers(self) -> dict:
        """Override in adapters to add auth headers."""
        return {"Accept": "application/json"}

    def _request(self, method: str, path: str, **kwargs) -> dict:
        timeout = kwargs.pop("timeout", DEFAULT_TIMEOUT)
        headers = {**self._headers(), **kwargs.pop("headers", {})}
        try:
            resp = self.session.request(
                method, self._url(path), headers=headers, timeout=timeout, **kwargs
            )
        except requests.Timeout as exc:
            raise ProviderTimeout(self.provider_key, "request timed out") from exc
        except requests.RequestException as exc:
            raise ProviderUnavailable(self.provider_key, str(exc)) from exc

        return self._handle_response(resp)

    def _handle_response(self, resp: requests.Response) -> dict:
        if resp.status_code in (401, 403):
            raise ProviderAuthError(self.provider_key, "auth rejected", raw=_safe_json(resp))
        if 400 <= resp.status_code < 500:
            raise ProviderValidationError(
                self.provider_key, f"rejected ({resp.status_code})", raw=_safe_json(resp)
            )
        if resp.status_code >= 500:
            raise ProviderUnavailable(
                self.provider_key, f"server error ({resp.status_code})", raw=_safe_json(resp)
            )
        return _safe_json(resp)

    def get(self, path, **kw):
        return self._request("GET", path, **kw)

    def post(self, path, **kw):
        return self._request("POST", path, **kw)


def _safe_json(resp: requests.Response) -> dict:
    try:
        return resp.json()
    except ValueError:
        return {"_raw_text": resp.text, "_status": resp.status_code}
