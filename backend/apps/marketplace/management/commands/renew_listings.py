"""
Renew marketplace listings whose expiry has passed (or is near), so they
reappear in the public marketplace. Nothing is deleted — this only pushes
expires_at forward.

Examples:
    python manage.py renew_listings                 # renew ALL expired listings (+30 days)
    python manage.py renew_listings --days 90       # give them 90 days of life
    python manage.py renew_listings --all           # renew every listing, expired or not
    python manage.py renew_listings --dry-run       # show what would change, change nothing
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.marketplace.models import Listing, LISTING_TTL_DAYS


class Command(BaseCommand):
    help = "Renew expired marketplace listings (push expires_at forward). Non-destructive."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=LISTING_TTL_DAYS,
                            help=f"How many days of life to give each listing (default {LISTING_TTL_DAYS}).")
        parser.add_argument("--all", action="store_true",
                            help="Renew every listing, not only the expired ones.")
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would change without saving.")

    def handle(self, *args, **opts):
        now = timezone.now()
        new_expiry = now + timedelta(days=opts["days"])

        qs = Listing.objects.all() if opts["all"] else Listing.objects.filter(expires_at__lte=now)
        # also make sure they're active so they actually show publicly
        count = qs.count()

        if count == 0:
            self.stdout.write("Nothing to renew.")
            return

        self.stdout.write(f"{'[DRY RUN] ' if opts['dry_run'] else ''}Renewing {count} listing(s) "
                          f"to expire on {new_expiry:%Y-%m-%d} ({opts['days']} days).")
        for l in qs:
            self.stdout.write(f"  · {l.title[:48]:<48}  {l.status:<8}  was {l.expires_at:%Y-%m-%d}")

        if opts["dry_run"]:
            self.stdout.write("Dry run — no changes saved.")
            return

        updated = qs.update(expires_at=new_expiry, status=Listing.Status.ACTIVE)
        self.stdout.write(self.style.SUCCESS(f"Done. {updated} listing(s) are live again until {new_expiry:%Y-%m-%d}."))
