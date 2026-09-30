#!/usr/bin/env python
"""
Wire the Jobs & Recruitment app (apps/jobs) into the OAM backend.

Run from the backend root (the folder with manage.py):

    python apply_jobs_backend.py            # apply
    python apply_jobs_backend.py --check    # show what would change, write nothing

Safe to run more than once: every edit is guarded by a marker and skipped if
it's already there. Each edited file is backed up once as <file>.bak-jobs.

What it changes
  requirements.txt              + django-filter, websockets
  config/settings/base.py       + apps, CHANNEL_LAYERS, JOBS_* settings, beat schedule
  config/urls.py                + /api/v1/jobs/
  config/asgi.py                HTTP + WebSocket router (Django Channels)
  config/celery.py              autodiscover apps.jobs tasks
  apps/uploads/purposes.py      + candidate_cv, company_logo, company_cover,
                                  company_document, job_chat_attachment
  apps/notifications/push.py    + push_to_user alias (fixes silent push failures)
  apps/payments/views.py        forward JOB- references from the main webhooks
  render.yaml                   ASGI start command (mirror of the dashboard setting)
  build.sh                      migrate -> migrate_safe (advisory lock; no deploy races)
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
MARK = "# [oam-jobs]"
changed, skipped, problems = [], [], []


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else None


def write(rel, text):
    p = ROOT / rel
    if CHECK:
        changed.append(rel)
        return
    bak = p.with_name(p.name + ".bak-jobs")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")
    changed.append(rel)


def need(rel):
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: file not found")
    return text


# --------------------------------------------------------------------------- #
def patch_requirements():
    rel = "requirements.txt"
    text = need(rel)
    if text is None:
        return
    if "django-filter" in text:
        skipped.append(rel)
        return
    text = text.rstrip() + ("\n\n# --- Jobs & Recruitment ---\n"
                            "django-filter==24.3\n"
                            "# uvicorn needs a WebSocket library to serve /ws/ (live chat)\n"
                            "websockets==12.0\n")
    write(rel, text)


SETTINGS_BLOCK = f'''

{MARK} ------------------------------------------------------------------------
# Jobs & Recruitment
# --------------------------------------------------------------------------
# Real-time chat + live pipeline updates (Django Channels). With REDIS_URL set,
# every web worker shares one channel layer; without it (local dev) an
# in-memory layer is used, which only works with a single process.
_REDIS_FOR_CHANNELS = env("REDIS_URL", default="")
CHANNEL_LAYERS = (
    {{"default": {{"BACKEND": "channels_redis.core.RedisChannelLayer",
                  "CONFIG": {{"hosts": [_REDIS_FOR_CHANNELS]}}}}}}
    if _REDIS_FOR_CHANNELS else
    {{"default": {{"BACKEND": "channels.layers.InMemoryChannelLayer"}}}}
)

# Run alert fan-out / moderation on Celery (True) or inline after commit (False).
# Leave False until a Celery worker is actually running in production.
JOBS_USE_CELERY = env.bool("JOBS_USE_CELERY", default=False)
# Hold listings from unverified employers for staff review before they go live.
JOBS_MODERATE_UNVERIFIED = env.bool("JOBS_MODERATE_UNVERIFIED", default=False)
# Risk score (0-100) at which a listing is flagged / held for review.
JOBS_FLAG_THRESHOLD = env.int("JOBS_FLAG_THRESHOLD", default=40)
JOBS_HOLD_THRESHOLD = env.int("JOBS_HOLD_THRESHOLD", default=70)
# Gateway for employer plans / job credits / boosts (defaults to the listing one).
JOBS_PAYMENT_PROVIDER = env("JOBS_PAYMENT_PROVIDER", default=LISTING_UPGRADE_PROVIDER)

from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {{
    **globals().get("CELERY_BEAT_SCHEDULE", {{}}),
    "jobs-expire-listings": {{"task": "jobs.expire_listings",
                             "schedule": crontab(minute="*/15")}},
    "jobs-alert-digests": {{"task": "jobs.send_due_alert_digests",
                           "schedule": crontab(minute=5)}},
    "jobs-flag-suspicious": {{"task": "jobs.flag_suspicious_listings",
                             "schedule": crontab(minute=20, hour="*/6")}},
    "jobs-plan-reminders": {{"task": "jobs.subscription_reminders",
                            "schedule": crontab(minute=0, hour=9)}},
    "jobs-matching-index": {{"task": "jobs.rebuild_matching_index",
                            "schedule": crontab(minute=40)}},
}}
CELERY_TASK_ROUTES = {{**CELERY_TASK_ROUTES, "jobs.*": {{"queue": "default"}}}}
'''


def patch_settings():
    rel = "config/settings/base.py"
    text = need(rel)
    if text is None:
        return
    if MARK in text:
        skipped.append(rel)
        return
    # 1) INSTALLED_APPS: third-party + local app
    anchor = '"rest_framework_simplejwt.token_blacklist",'
    if anchor not in text:
        problems.append(f"{rel}: couldn't find {anchor} in INSTALLED_APPS")
        return
    extra = anchor + f'\n    "django_filters",  {MARK}\n    "channels",  {MARK}'
    text = text.replace(anchor, extra, 1)
    apps_anchor = re.search(r'^\s*"apps\.reloadly",\s*$', text, flags=re.M)
    if not apps_anchor:
        problems.append(f"{rel}: couldn't find \"apps.reloadly\" in INSTALLED_APPS")
        return
    line = apps_anchor.group(0)
    text = text.replace(line, line + f'\n    "apps.jobs",  {MARK} jobs & recruitment', 1)
    # 2) settings block at the end
    text = text.rstrip() + "\n" + SETTINGS_BLOCK
    write(rel, text)


def patch_urls():
    rel = "config/urls.py"
    text = need(rel)
    if text is None:
        return
    if "apps.jobs.urls" in text:
        skipped.append(rel)
        return
    anchor = 'path("api/v1/notifications/", include("apps.notifications.urls")),'
    if anchor not in text:
        problems.append(f"{rel}: couldn't find the notifications url line")
        return
    text = text.replace(anchor, anchor + f'\n    path("api/v1/jobs/", include("apps.jobs.urls")),'
                                         f'  {MARK}', 1)
    write(rel, text)


ASGI = f'''"""
ASGI entrypoint: normal Django HTTP + WebSockets (Django Channels).

{MARK} Run with:  gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# Initialise Django BEFORE importing anything that touches models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.jobs.realtime.auth import JWTAuthMiddlewareStack  # noqa: E402
from apps.jobs.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({{
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
}})
'''


def patch_asgi():
    rel = "config/asgi.py"
    text = need(rel)
    if text is None:
        return
    if "ProtocolTypeRouter" in text:
        skipped.append(rel)
        return
    write(rel, ASGI)


def patch_celery():
    rel = "config/celery.py"
    text = need(rel)
    if text is None:
        return
    if "apps.jobs" in text:
        skipped.append(rel)
        return
    old = 'app.autodiscover_tasks(["tasks"])'
    if old not in text:
        problems.append(f"{rel}: couldn't find autodiscover_tasks line")
        return
    text = text.replace(old, 'app.autodiscover_tasks(["tasks", "apps.jobs"])  ' + MARK, 1)
    write(rel, text)


PURPOSES = f'''
{MARK} Jobs & Recruitment uploads
PURPOSES.update({{
    "candidate_cv": Purpose(
        key="candidate_cv",
        folder="oam/jobs/cv",
        resource_type="raw",
        delivery_type="upload",
        max_bytes=10 * MB,
        allowed_formats=["pdf", "doc", "docx"],
        label="CV / résumé",
        hint="PDF or Word, up to 10 MB.",
    ),
    "company_logo": Purpose(
        key="company_logo",
        folder="oam/jobs/logos",
        resource_type="image",
        delivery_type="upload",
        max_bytes=5 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "svg"],
        label="Company logo",
        min_width=128,
        min_height=128,
    ),
    "company_cover": Purpose(
        key="company_cover",
        folder="oam/jobs/covers",
        resource_type="image",
        delivery_type="upload",
        max_bytes=8 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp"],
        label="Company cover image",
        min_width=800,
        min_height=300,
    ),
    "company_document": Purpose(
        key="company_document",
        folder="oam/jobs/verification",
        resource_type="image",
        delivery_type="upload",
        max_bytes=10 * MB,
        allowed_formats=["jpg", "jpeg", "png", "pdf"],
        label="Company registration document",
        hint="e.g. your CAC certificate.",
    ),
    "job_chat_attachment": Purpose(
        key="job_chat_attachment",
        folder="oam/jobs/chat",
        resource_type="auto",
        delivery_type="upload",
        max_bytes=15 * MB,
        allowed_formats=["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp", "txt"],
        label="Attachment",
        hint="Documents or images up to 15 MB.",
    ),
}})
'''


def patch_purposes():
    rel = "apps/uploads/purposes.py"
    text = need(rel)
    if text is None:
        return
    if "candidate_cv" in text:
        skipped.append(rel)
        return
    write(rel, text.rstrip() + "\n\n" + PURPOSES)


def patch_push():
    rel = "apps/notifications/push.py"
    text = need(rel)
    if text is None:
        return
    if "push_to_user =" in text or "def push_to_user" in text:
        skipped.append(rel)
        return
    text = text.rstrip() + (
        f"\n\n\n{MARK} services.notify() imports `push_to_user`, which never existed, so\n"
        "# every push silently failed. Alias it to the real sender.\n"
        "push_to_user = send_push_to_user\n")
    write(rel, text)


def patch_payment_webhooks():
    rel = "apps/payments/views.py"
    text = need(rel)
    if text is None:
        return
    if "apps.jobs" in text:
        skipped.append(rel)
        return
    targets = [
        ('            FundingService.settle(data.get("reference", ""), verified_status=verified, raw=data)\n',
         'data.get("reference", "")'),
        ('            FundingService.settle(ref, verified_status=verified, raw=data)\n', "ref"),
    ]
    done = 0
    for line, ref_expr in targets:
        if line in text:
            hook = (line +
                    f"            try:  {MARK} employer plans / job credits / boosts\n"
                    "                from apps.jobs.services import PaymentService as _JobsPay\n"
                    f"                _JobsPay.activate_by_reference({ref_expr})\n"
                    "            except Exception:\n"
                    "                pass\n")
            text = text.replace(line, hook, 1)
            done += 1
    if done == 0:
        problems.append(f"{rel}: webhook settle lines not found — jobs payments will rely on "
                        "/api/v1/jobs/billing/verify/ and /api/v1/jobs/billing/webhook/")
        return
    write(rel, text)


def patch_render():
    """
    Keeps render.yaml in step with the dashboard. Your services were created
    by hand, so Render does NOT read this file — change the start command in
    the dashboard too (see the message printed at the end).
    """
    rel = "render.yaml"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if "config.asgi:application" in text:
        skipped.append(rel)
        return
    old = 'startCommand: "gunicorn config.wsgi:application --workers 2 --timeout 120"'
    if old not in text:
        skipped.append(rel + " (start command not found; update it in the dashboard)")
        return
    text = text.replace(
        old, 'startCommand: "gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker '
             '--workers 2 --timeout 120"  ' + MARK + " ASGI for WebSockets", 1)
    write(rel, text)


def patch_build():
    rel = "build.sh"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if "migrate_safe" in text:
        skipped.append(rel)
        return
    lines = text.splitlines(keepends=True)
    hit = False
    for i, line in enumerate(lines):
        if line.strip() == "python manage.py migrate":
            lines[i] = line.replace("python manage.py migrate",
                                    "python manage.py migrate_safe  " + MARK
                                    + " one migrate at a time")
            hit = True
    if not hit:
        problems.append(f"{rel}: no 'python manage.py migrate' line; use migrate_safe there")
        return
    write(rel, "".join(lines))


RENDER_STEPS = """
On Render (dashboard -> oam-api service):
  1. Settings -> Start Command:
       gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker --workers 2 --timeout 120
  2. Create a Key Value (Redis) instance in the same region, then add
       REDIS_URL = <its Internal URL>          to oam-api's Environment
  3. Add  JOBS_CRON_SECRET = <any long random string>  to oam-api's Environment
  4. Push. build.sh runs `migrate`, so the jobs tables are created on deploy.
"""


def main():
    if not (ROOT / "manage.py").exists():
        print("Run this from the backend root (the folder containing manage.py).")
        sys.exit(1)
    if not (ROOT / "apps" / "jobs" / "models.py").exists():
        print("apps/jobs is missing — unzip oam-jobs-backend.zip into this folder first.")
        sys.exit(1)
    for fn in (patch_requirements, patch_settings, patch_urls, patch_asgi, patch_celery,
               patch_purposes, patch_push, patch_payment_webhooks, patch_render, patch_build):
        fn()
    verb = "Would change" if CHECK else "Changed"
    print(f"{verb}: " + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext (local): pip install -r requirements.txt && python manage.py migrate jobs")
    print(RENDER_STEPS)


if __name__ == "__main__":
    main()
