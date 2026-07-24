"""
Verifies an Apple `id_token` (a JWT) against Apple's public keys.

Apple only returns the user's name on the FIRST authorization, so the frontend
must forward it; we read first/last name from `data` when present.

Note: RS256 verification needs the `cryptography` package installed.
"""
from __future__ import annotations

import jwt
from jwt import PyJWKClient
from django.conf import settings

from .base import BaseVerifier, SocialProfile
from .exceptions import SocialAuthError

APPLE_KEYS = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"


class AppleVerifier(BaseVerifier):
    provider = "apple"

    def verify(self, token, data=None):
        data = data or {}
        audience = settings.SOCIAL_AUTH.get("apple", {}).get("client_ids", [])
        try:
            signing_key = PyJWKClient(APPLE_KEYS).get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token, signing_key.key, algorithms=["RS256"],
                audience=audience or None, issuer=APPLE_ISSUER,
            )
        except Exception as exc:  # jwt raises several types; treat all as auth failure
            raise SocialAuthError("Invalid Apple token.") from exc

        return SocialProfile(
            provider="apple",
            provider_user_id=payload["sub"],
            email=(payload.get("email") or "").lower() or None,
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            email_verified=str(payload.get("email_verified", "true")).lower() == "true",
        )
