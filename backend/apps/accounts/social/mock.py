"""
DEV-ONLY verifier. Lets you exercise the link-or-create flow without real
provider tokens. Only reachable when DEBUG and SOCIAL_AUTH_ALLOW_MOCK are True
and the client sends token == "MOCK".
"""
from __future__ import annotations

from .base import BaseVerifier, SocialProfile
from .exceptions import SocialAuthError


class MockVerifier(BaseVerifier):
    def __init__(self, provider):
        self.provider = provider

    def verify(self, token, data=None):
        data = data or {}
        email = (data.get("email") or "").lower() or None
        if not email:
            raise SocialAuthError("Mock social auth requires an 'email' field.")
        return SocialProfile(
            provider=self.provider,
            provider_user_id=data.get("provider_user_id") or f"mock-{self.provider}-{email}",
            email=email,
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            email_verified=True,
        )
