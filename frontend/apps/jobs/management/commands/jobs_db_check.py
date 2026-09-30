"""
Show whether the jobs tables and their migration records agree.

    python manage.py jobs_db_check
    python manage.py jobs_db_check --repair   # drop orphaned, EMPTY jobs tables

"Orphaned" = jobs_* tables exist but django_migrations has no jobs rows, which
blocks `migrate`. --repair only ever drops jobs_* tables, and refuses if any of
them contains a row.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Diagnose (and optionally repair) the jobs tables."

    def add_arguments(self, parser):
        parser.add_argument("--repair", action="store_true")

    def handle(self, *args, repair=False, **opts):
        with connection.cursor() as cur:
            tables = sorted(t for t in connection.introspection.table_names(cur)
                            if t.startswith("jobs_"))
            cur.execute("SELECT name FROM django_migrations WHERE app = 'jobs' ORDER BY name")
            applied = [r[0] for r in cur.fetchall()]
            counts = {}
            for t in tables:
                cur.execute(f'SELECT COUNT(*) FROM "{t}"')
                counts[t] = cur.fetchone()[0]

        self.stdout.write(f"jobs migrations recorded: {applied or 'none'}")
        self.stdout.write(f"jobs tables present: {len(tables)}")
        for t in tables:
            self.stdout.write(f"  {t}: {counts[t]} rows")

        if applied and tables:
            self.stdout.write(self.style.SUCCESS("OK — tables and migration records agree."))
            return
        if not tables:
            self.stdout.write(self.style.SUCCESS("No jobs tables yet — the next migrate "
                                                 "will create them."))
            return

        self.stdout.write(self.style.WARNING(
            "ORPHANED: jobs tables exist but no jobs migration is recorded."))
        if not repair:
            self.stdout.write("Run again with --repair to drop them (only if all are empty).")
            return
        if any(counts.values()):
            raise CommandError("Refusing to repair: some jobs tables contain rows.")
        with connection.cursor() as cur:
            for t in tables:
                cur.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
        self.stdout.write(self.style.SUCCESS(f"Dropped {len(tables)} empty jobs tables. "
                                             "Redeploy to recreate them cleanly."))
