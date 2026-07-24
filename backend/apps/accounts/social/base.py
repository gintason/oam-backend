"""Shared types for social verification."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SocialProfile:
    """Normalised identity returned by every provider verifier."""
    provider: str
    provider_user_id: str          # provider's stable subject id ("sub")
    email: str | None
    first_name: str = ""
    last_name: str = ""
    email_verified: bool = False


class BaseVerifier:
    provider = "base"

    def verify(self, token: str, data: dict | None = None) -> SocialProfile:
        raise NotImplementedError
