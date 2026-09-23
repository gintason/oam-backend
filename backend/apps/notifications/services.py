"""Create in-app notifications (and optionally email/push) for a user."""
import logging

logger = logging.getLogger(__name__)


def notify(user, *, kind, title, body="", data=None, email=False):
    """Create a bell-feed notification for `user`. Best-effort email + push on top.
    Never raises — a notification failure must never break the money flow."""
    from .models import Notification
    n = None
    try:
        n = Notification.objects.create(
            user=user, kind=kind, title=title, body=body, data=data or {})
    except Exception:
        logger.exception("notify: could not create notification")

    # Best-effort Expo push (if the project wires it) — silent on failure.
    try:
        from .push import push_to_user  # optional
        push_to_user(user, title=title, body=body, data=data or {})
    except Exception:
        pass

    if email and getattr(user, "email", ""):
        try:
            from .emails import send_notification_email
            send_notification_email(user=user, title=title, body=body)
        except Exception:
            logger.exception("notify: could not send email")
    return n
