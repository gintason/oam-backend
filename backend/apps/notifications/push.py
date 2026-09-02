"""
Send push notifications to a user's devices via Expo's push service.
Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import logging

import requests

from .models import DeviceToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_to_user(user, title, body, data=None):
    """Push `title`/`body` to every active token the user has. Best-effort."""
    tokens = list(
        DeviceToken.objects.filter(user=user, is_active=True)
        .values_list("token", flat=True)
    )
    if not tokens:
        return

    messages = [
        {"to": t, "title": title, "body": body, "sound": "default", "data": data or {}}
        for t in tokens
    ]
    try:
        resp = requests.post(
            EXPO_PUSH_URL, json=messages, timeout=10,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        payload = resp.json()
    except Exception as exc:  # network / parse issues are non-fatal
        logger.warning("Expo push failed: %s", exc)
        return

    # Deactivate tokens Expo reports as no longer registered.
    tickets = payload.get("data") or []
    dead = []
    for token, ticket in zip(tokens, tickets):
        if isinstance(ticket, dict) and ticket.get("status") == "error":
            details = ticket.get("details") or {}
            if details.get("error") == "DeviceNotRegistered":
                dead.append(token)
    if dead:
        DeviceToken.objects.filter(token__in=dead).update(is_active=False)
