"""
Push events to connected WebSocket clients.

Every signed-in socket joins one group per user ("jobs.user.<uuid>"), so the
server never has to know which screen a client is on: chat messages, typing
indicators, application status changes and alerts all go to the user's group
and the client routes them by `type`.

Broadcasting is best-effort and always runs after the DB transaction commits —
a client must never receive a message that then rolls back. If no channel
layer is configured (e.g. a management command), it silently does nothing.
"""
from __future__ import annotations

import json
import logging

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction

logger = logging.getLogger(__name__)


def user_group(user_id) -> str:
    return f"jobs.user.{user_id}"


def _send_now(user_ids, payload: dict):
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        if layer is None:
            return
        for uid in {str(u) for u in user_ids if u}:
            async_to_sync(layer.group_send)(user_group(uid), {"type": "jobs.event",
                                                              "payload": payload})
    except Exception:  # never let realtime break a request
        logger.warning("jobs realtime broadcast failed", exc_info=True)


def broadcast(user_ids, event_type: str, data: dict):
    # Round-trip through DjangoJSONEncoder: serializer output contains UUIDs,
    # Decimals and datetimes, which neither the socket JSON nor the Redis
    # channel layer's msgpack can encode.
    payload = json.loads(json.dumps({"type": event_type, "data": data}, cls=DjangoJSONEncoder))
    transaction.on_commit(lambda: _send_now(user_ids, payload))
