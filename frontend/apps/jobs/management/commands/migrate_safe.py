"""
`migrate`, but only one at a time.

If two builds (or two services sharing the database) run `migrate` at the same
moment, both try to CREATE the same tables and one crashes with
    duplicate key value violates unique constraint "pg_type_typname_nsp_index"
This takes a Postgres advisory lock first, so the second run waits for the
first to finish and then finds nothing left to do.

    python manage.py migrate_safe            # use in build.sh instead of migrate
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

LOCK_ID = 72_651_001  # any constant shared by every process that migrates


class Command(BaseCommand):
    help = "Run migrate under a Postgres advisory lock (safe for concurrent deploys)."

    def add_arguments(self, parser):
        parser.add_argument("args", nargs="*", help="Passed through to migrate")

    def handle(self, *args, **options):
        verbosity = options.get("verbosity", 1)
        if connection.vendor != "postgresql":
            call_command("migrate", *args, interactive=False, verbosity=verbosity)
            return
        with connection.cursor() as cur:
            self.stdout.write("Waiting for migration lock…")
            cur.execute("SELECT pg_advisory_lock(%s)", [LOCK_ID])
        try:
            call_command("migrate", *args, interactive=False, verbosity=verbosity)
        finally:
            with connection.cursor() as cur:
                cur.execute("SELECT pg_advisory_unlock(%s)", [LOCK_ID])
