"""
JWT authentication for WebSockets.

Browsers can't set an Authorization header on `new WebSocket(...)`, so the
client passes its SimpleJWT access token as `?token=<access>`. The token is
validated exactly as the REST API does it; an invalid or expired token leaves
the scope as AnonymousUser and the consumer closes the socket with 4401.

We deliberately don't wrap this in AllowedHostsOriginValidator: React Native
sockets send no Origin header and would be rejected, and cross-site socket
hijacking isn't possible here because auth comes from the token, not cookies.
"""
from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _user_from_token(raw: str):
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.settings import api_settings
    from rest_framework_simplejwt.tokens import AccessToken
    try:
        token = AccessToken(raw)
    except TokenError:
        return AnonymousUser()
    user_id = token.get(api_settings.USER_ID_CLAIM)
    User = get_user_model()
    try:
        user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
    except (User.DoesNotExist, ValueError):
        return AnonymousUser()
    return user if user.is_active else AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        qs = parse_qs((scope.get("query_string") or b"").decode())
        raw = (qs.get("token") or [""])[0]
        scope["user"] = await _user_from_token(raw) if raw else AnonymousUser()
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
