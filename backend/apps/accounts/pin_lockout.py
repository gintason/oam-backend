"""
Transaction-PIN lockout. A 4-digit PIN has only 10,000 combinations, so after
PIN_MAX_ATTEMPTS wrong tries in a row the PIN is locked for PIN_LOCK_MINUTES.
A correct PIN resets the counter. Shared across workers via the Django cache.

When locked, checks raise DRF's Throttled (HTTP 429) with a clear message, so
every view that checks the PIN (transfer, withdraw, change PIN) handles it
without extra code.
"""
from __future__ import annotations

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import Throttled

MAX_ATTEMPTS = getattr(settings, "PIN_MAX_ATTEMPTS", 5)
LOCK_SECONDS = getattr(settings, "PIN_LOCK_MINUTES", 15) * 60


def _fails_key(user_id) -> str:
    return f"pin:fails:{user_id}"


def _lock_key(user_id) -> str:
    return f"pin:lock:{user_id}"


def ensure_not_locked(user_id) -> None:
    if cache.get(_lock_key(user_id)):
        minutes = max(1, LOCK_SECONDS // 60)
        raise Throttled(
            wait=LOCK_SECONDS,
            detail=f"Too many wrong PIN attempts. For your security, PIN use is paused for {minutes} minutes.",
        )


def record_result(user_id, ok: bool) -> None:
    if ok:
        cache.delete(_fails_key(user_id))
        return
    key = _fails_key(user_id)
    fails = (cache.get(key) or 0) + 1
    if fails >= MAX_ATTEMPTS:
        cache.set(_lock_key(user_id), 1, LOCK_SECONDS)
        cache.delete(key)
    else:
        cache.set(key, fails, LOCK_SECONDS)
