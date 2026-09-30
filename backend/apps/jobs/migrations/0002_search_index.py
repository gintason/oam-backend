"""
PostgreSQL-only: GIN index on the stored full-text vector.

Written as RunPython so the same migration still applies on SQLite (quick
local dev), where full-text search falls back to icontains.
"""
from django.db import migrations

INDEX = "jobs_listing_search_gin"


def forwards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        f"CREATE INDEX IF NOT EXISTS {INDEX} ON jobs_joblisting USING GIN (search_vector)")


def backwards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(f"DROP INDEX IF EXISTS {INDEX}")


class Migration(migrations.Migration):
    dependencies = [("jobs", "0001_initial")]
    operations = [migrations.RunPython(forwards, backwards)]
