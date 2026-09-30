"""Verifies a Google `id_token` by asking Google's tokeninfo endpoint."""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .base import BaseVerifier, SocialProfile
from .exceptions import SocialAuthError

log = logging.getLogger(__name__)

TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def allowed_client_ids() -> list[str]:
    """GOOGLE_CLIENT_IDS, cleaned: "a, b" in the env must not become [" b"]."""
    raw = settings.SOCIAL_AUTH.get("google", {}).get("client_ids", [])
    if isinstance(raw, str):
        raw = raw.split(",")
    return [c.strip() for c in raw if c and c.strip()]


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

        if payload.get("iss") and payload["iss"] not in ISSUERS:
            raise SocialAuthError("Invalid Google token.")

        # `aud` is the client ID the token was requested for: the web client
        # ID on the website, and the `webClientId` the mobile app passes to
        # GoogleSignin.configure(). Both must be listed in GOOGLE_CLIENT_IDS.
        allowed = allowed_client_ids()
        aud = payload.get("aud")
        if allowed and aud not in allowed:
            log.warning(
                "Google sign-in rejected: token aud=%s (azp=%s) is not in GOOGLE_CLIENT_IDS=%s",
                aud, payload.get("azp"), allowed,
            )
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
