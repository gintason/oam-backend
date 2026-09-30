"""
Brute-force protection for the public auth endpoints.

Two layers, both via DRF throttling (backed by the Django cache — Redis when
REDIS_URL is set, so limits are shared across all workers):

  * per IP        — ScopedRateThrottle with `throttle_scope` on the view
  * per account   — IdentifierRateThrottle, keyed on the email / phone being
                    tried, so rotating IPs doesn't help against one account.

Rates live in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] (settings, "oam-security").
"""
from __future__ import annotations

import hashlib

from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle


def _identifier(request) -> str:
    data = getattr(request, "data", None) or {}
    try:
        raw = data.get("identifier") or data.get("email") or data.get("phone") or ""
    except AttributeError:
        return ""
    return str(raw).strip().lower()


class IdentifierRateThrottle(SimpleRateThrottle):
    """Limits attempts against one account, whatever IP they come from.

    The view sets `identifier_throttle_scope`, e.g. "auth_login_account".
    """

    def get_rate(self):
        # Scope comes from the view, so it must be read before the rate lookup.
        return super().get_rate() if getattr(self, "scope", None) else None

    def allow_request(self, request, view):
        self.scope = getattr(view, "identifier_throttle_scope", None)
        if not self.scope:
            return True
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        ident = _identifier(request)
        if not ident:
            return None                     # nothing to key on: the IP throttle still applies
        digest = hashlib.sha256(ident.encode()).hexdigest()[:32]   # don't keep raw emails in cache keys
        return self.cache_format % {"scope": self.scope, "ident": digest}


AUTH_THROTTLES = [ScopedRateThrottle, IdentifierRateThrottle]
