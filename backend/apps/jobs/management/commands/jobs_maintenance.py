"""
Run the jobs housekeeping without Celery (e.g. a Render cron every 15 minutes):

    python manage.py jobs_maintenance                 # everything
    python manage.py jobs_maintenance --only expire alerts
    python manage.py jobs_maintenance --reindex       # rebuild search vectors
"""
from django.core.management.base import BaseCommand

TASKS = ("expire", "alerts", "flags", "reminders", "matching")


class Command(BaseCommand):
    help = "Expire old job listings, send due job alerts, flag suspicious posts."

    def add_arguments(self, parser):
        parser.add_argument("--only", nargs="+", choices=TASKS)
        parser.add_argument("--reindex", action="store_true",
                            help="Recompute the Postgres full-text vectors for all listings.")

    def handle(self, *args, only=None, reindex=False, **opts):
        from apps.jobs.matching import build_idf
        from apps.jobs.search import refresh_search_vector
        from apps.jobs.services import AlertService, MaintenanceService

        run = set(only or TASKS)
        if reindex:
            self.stdout.write(f"reindexed: {refresh_search_vector()}")
        if "expire" in run:
            self.stdout.write(f"expired listings: {MaintenanceService.expire_listings()}")
            self.stdout.write(f"expired promotions: {MaintenanceService.expire_promotions()}")
        if "alerts" in run:
            self.stdout.write(f"alert digests: {AlertService.send_due_digests()}")
        if "flags" in run:
            self.stdout.write(f"rescanned (risk>0): {MaintenanceService.rescan_recent()}")
        if "reminders" in run:
            self.stdout.write(f"plan reminders: {MaintenanceService.subscription_reminders()}")
        if "matching" in run:
            self.stdout.write(f"matching vocabulary: {len(build_idf(force=True))} terms")
        self.stdout.write(self.style.SUCCESS("jobs maintenance done"))
