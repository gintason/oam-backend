"""Create a test bell notification for a user, to verify the feed end-to-end.

Usage on Render shell:
    python manage.py send_test_notification --email you@example.com
Then open the app — the bell should show a red dot within ~30s.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create a test notification for a user (by email or phone)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=None)
        parser.add_argument("--phone", default=None)

    def handle(self, *args, **opts):
        U = get_user_model()
        q = {}
        if opts["email"]:
            q["email__iexact"] = opts["email"]
        elif opts["phone"]:
            q["phone"] = opts["phone"]
        else:
            self.stderr.write("Pass --email or --phone")
            return
        user = U.objects.filter(**q).first()
        if not user:
            self.stderr.write("No user found for %s" % q)
            return
        from apps.notifications.models import Notification
        n = Notification.objects.create(
            user=user, kind="general", title="Test notification",
            body="If you can see this in the bell, the feed works.", data={})
        total = Notification.objects.filter(user=user).count()
        unread = Notification.objects.filter(user=user, is_read=False).count()
        self.stdout.write(self.style.SUCCESS(
            f"Created notification #{n.id} for {user}. total={total} unread={unread}"))
