"""Verifies a Google `id_token` by asking Google's tokeninfo endpoint."""
from __future__ import annotations

import requests
from django.conf import settings

from .base import BaseVerifier, SocialProfile
from .exceptions import SocialAuthError

TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"


class GoogleVerifier(BaseVerifier):
    provider = "google"

    def verify(self, token, data=None):
        try:
            resp = requests.get(TOKENINFO, params={"id_token": token}, timeout=10)
        except requests.RequestException as exc:
            raise SocialAuthError("Could not reach Google to verify the token.") from exc
        if resp.status_code != 200:
            raise SocialAuthError("Invalid Google token.")
        payload = resp.json()

        allowed = settings.SOCIAL_AUTH.get("google", {}).get("client_ids", [])
        if allowed and payload.get("aud") not in allowed:
            raise SocialAuthError("Google token was issued for a different app.")
        if str(payload.get("email_verified", "true")).lower() != "true":
            raise SocialAuthError("This Google email is not verified.")

        return SocialProfile(
            provider="google",
            provider_user_id=payload["sub"],
            email=(payload.get("email") or "").lower() or None,
            first_name=payload.get("given_name", ""),
            last_name=payload.get("family_name", ""),
            email_verified=True,
        )
