"""
Side effects shared by dispatch + services: errors, timeline, notifications,
and live socket events.

Sockets reuse the jobs WebSocket (`ws/jobs/`): every signed-in client is in
its own user group, and these events carry `delivery.*` types the apps route.
Everything here runs after commit and never raises into the money flow.
"""
from __future__ import annotations

import logging

from django.db import transaction

from .models import DeliveryEvent

logger = logging.getLogger(__name__)


class DeliveryError(Exception):
    """A user-facing rule violation with a machine-readable code."""

    def __init__(self, message, code="invalid", status=400):
        super().__init__(message)
        self.code = code
        self.status = status


def money(amount, currency="NGN") -> str:
    symbol = {"NGN": "₦", "USD": "$", "GBP": "£", "EUR": "€"}.get(currency, f"{currency} ")
    return f"{symbol}{amount:,.0f}"


def timeline(delivery, status, *, note="", actor="system", lat=None, lng=None):
    return DeliveryEvent.objects.create(delivery=delivery, status=status, note=note[:255],
                                        actor=actor, lat=lat, lng=lng)


def broadcast(user_ids, event_type, data):
    try:
        from apps.jobs.realtime.events import broadcast as _broadcast
        _broadcast(user_ids, event_type, data)
    except Exception:
        logger.warning("deliveries broadcast failed", exc_info=True)


def notify(user, *, title, body="", data=None, email=False):
    """Bell feed + push (apps.notifications) + a live `notification` event."""
    data = {"module": "deliveries", **(data or {})}

    def _go():
        try:
            from apps.notifications.services import notify as _notify
            _notify(user, kind="general", title=title, body=body, data=data, email=email)
        except Exception:
            logger.warning("deliveries notify failed", exc_info=True)

    transaction.on_commit(_go)
    broadcast([user.id], "notification", {"title": title, "body": body, "data": data})


def push_only(user, *, title, body, data=None):
    """Push without a bell row — for rider offers, which expire in seconds."""
    payload = {"module": "deliveries", **(data or {})}

    def _go():
        try:
            from apps.notifications.push import send_push_to_user
            send_push_to_user(user, title, body, payload)
        except Exception:
            logger.warning("deliveries push failed", exc_info=True)

    transaction.on_commit(_go)


def live_summary(d) -> dict:
    """Small payload for socket events — clients refetch details on receipt."""
    rider = d.rider
    return {
        "id": str(d.id), "reference": d.reference, "status": d.status,
        "status_label": d.get_status_display(), "payment_status": d.payment_status,
        "rider": ({"id": str(rider.id), "name": rider.full_name, "phone": rider.phone,
                   "lat": rider.lat, "lng": rider.lng} if rider else None),
        "dispatch_exhausted": d.dispatch_exhausted,
    }


def delivery_updated(d, *, extra_user_ids=()):
    ids = [d.customer_id, *(extra_user_ids or ())]
    if d.rider_id:
        ids.append(d.rider.user_id)
    broadcast(ids, "delivery.updated", live_summary(d))
