"""Helpers other apps use to hide blocked people."""
from __future__ import annotations

import logging

from django.db.models import Q

logger = logging.getLogger(__name__)


def hidden_user_ids(user) -> set:
    """Everyone this user blocked AND everyone who blocked this user."""
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    from .models import Block
    rows = Block.objects.filter(Q(blocker=user) | Q(blocked=user)).values_list(
        "blocker_id", "blocked_id")
    ids = set()
    for a, b in rows:
        ids.add(b if a == user.id else a)
    return ids


def is_blocked_between(a, b) -> bool:
    """a / b may be users or user ids."""
    from .models import Block
    a = getattr(a, "id", a); b = getattr(b, "id", b)
    if not a or not b:
        return False
    return Block.objects.filter(Q(blocker_id=a, blocked_id=b) |
                                Q(blocker_id=b, blocked_id=a)).exists()


def resolve_target(target_type: str, target_id: str):
    """Return (exists, owner_user) for a reported item."""
    try:
        if target_type == "listing":
            from apps.marketplace.models import Listing
            o = Listing.objects.filter(id=target_id).select_related("seller").first()
            return (o is not None, o.seller if o else None)
        if target_type == "artisan":
            from apps.homeservices.models import ArtisanProfile
            o = ArtisanProfile.objects.filter(id=target_id).select_related("user").first()
            return (o is not None, o.user if o else None)
        if target_type == "comment":
            from apps.marketplace.models import ListingComment
            o = ListingComment.objects.filter(id=target_id).select_related("user").first()
            return (o is not None, o.user if o else None)
        if target_type == "message":
            from apps.messaging.models import Message
            o = Message.objects.filter(id=target_id).select_related("sender").first()
            return (o is not None, o.sender if o else None)
        if target_type == "conversation":
            return (True, None)  # owner worked out by the view (the other party)
        if target_type == "user":
            from django.contrib.auth import get_user_model
            o = get_user_model().objects.filter(id=target_id).first()
            return (o is not None, o)
    except Exception:  # bad id format etc.
        return (False, None)
    return (False, None)


def alert_staff(report) -> None:
    """Email ops so reports are reviewed within 24 hours. Never raises."""
    try:
        from django.conf import settings
        from django.core.mail import send_mail
        from apps.payouts.services import _ops_recipients
        to = _ops_recipients()
        if not to:
            logger.warning("report %s: no ops recipients set", report.pk)
            return
        send_mail(
            f"[O.A.M] New report: {report.get_target_type_display()} — {report.reason}",
            (f"Reporter: {report.reporter}\n"
             f"Item: {report.target_type} {report.target_id}\n"
             f"Reported user: {report.reported_user or '-'}\n"
             f"Reason: {report.reason}\nDetails: {report.details or '-'}\n\n"
             "Review it in Django admin → Reports & blocks → Reports (within 24 hours)."),
            getattr(settings, "DEFAULT_FROM_EMAIL", None), to, fail_silently=True,
        )
    except Exception:
        logger.exception("report alert email failed")
