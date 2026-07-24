"""Verifies a Facebook access token via the Graph API."""
from __future__ import annotations

import requests
from django.conf import settings

from .base import BaseVerifier, SocialProfile
from .exceptions import SocialAuthError

GRAPH = "https://graph.facebook.com"


class FacebookVerifier(BaseVerifier):
    provider = "facebook"

    def verify(self, token, data=None):
        cfg = settings.SOCIAL_AUTH.get("facebook", {})
        app_id, app_secret = cfg.get("app_id"), cfg.get("app_secret")
        try:
            if app_id and app_secret:
                dbg = requests.get(
                    f"{GRAPH}/debug_token",
                    params={"input_token": token, "access_token": f"{app_id}|{app_secret}"},
                    timeout=10,
                ).json().get("data", {})
                if not dbg.get("is_valid"):
                    raise SocialAuthError("Invalid Facebook token.")
                if str(dbg.get("app_id")) != str(app_id):
                    raise SocialAuthError("Facebook token was issued for a different app.")
            me = requests.get(
                f"{GRAPH}/me",
                params={"fields": "id,first_name,last_name,email", "access_token": token},
                timeout=10,
            ).json()
        except requests.RequestException as exc:
            raise SocialAuthError("Could not reach Facebook to verify the token.") from exc

        if "id" not in me:
            raise SocialAuthError("Invalid Facebook token.")
        email = (me.get("email") or "").lower() or None
        return SocialProfile(
            provider="facebook",
            provider_user_id=me["id"],
            email=email,
            first_name=me.get("first_name", ""),
            last_name=me.get("last_name", ""),
            email_verified=bool(email),
        )
