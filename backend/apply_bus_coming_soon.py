#!/usr/bin/env python
"""
Bus Tickets -> "Coming soon" on the backend (until the live provider keys arrive).

Unzip oam-bus-coming-soon-backend.zip in the backend root first, then:
    python3 apply_bus_coming_soon.py

  apps/travu/availability.py   (zip) the switch; searching/booking answers 503
                               "Bus tickets are coming soon" while it's off — also
                               for older app versions that still show the screen
  apps/travu/views.py          trip search + booking check the switch (past bookings
                               and an in-progress card payment stay available)
  config/settings/base.py      BUS_TICKETS_LIVE (env, default false)
  apps/seo/views.py            (if installed) /travel/bus left out of the sitemap while off
  apps/assistant/knowledge.py  the AI assistant says bus tickets are coming soon

To switch ON later: Render -> backend -> Environment -> BUS_TICKETS_LIVE = true.
No migration. Backups: *.bak-bussoon
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def patch(rel, marker, reps, optional=False):
    p = ROOT / rel
    if not p.exists():
        (skipped if optional else problems).append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:80]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-bussoon")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "manage.py").exists():
    print("Run this from the backend root (the folder containing manage.py).")
    sys.exit(1)
if not (ROOT / "apps/travu/availability.py").exists():
    print("apps/travu/availability.py is missing — unzip oam-bus-coming-soon-backend.zip here first.")
    sys.exit(1)

patch("apps/travu/views.py", "BusTicketsLive", [
    ("from .booking import BusBookingService, fee_per_seat\n",
     "from .availability import BusTicketsLive\nfrom .booking import BusBookingService, fee_per_seat\n"),
    ('''    """POST /travu/trips/ {departure_state, destination_state, trip_date} -> trips."""
    permission_classes = [IsAuthenticated]''',
     '''    """POST /travu/trips/ {departure_state, destination_state, trip_date} -> trips."""
    permission_classes = [IsAuthenticated, BusTicketsLive]'''),
    ('''    """POST /travu/book/ — create booking + take payment (wallet or card)."""
    permission_classes = [IsVerified]''',
     '''    """POST /travu/book/ — create booking + take payment (wallet or card)."""
    permission_classes = [IsVerified, BusTicketsLive]'''),
])

patch("config/settings/base.py", "BUS_TICKETS_LIVE", [
    ('CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")',
     '# Bus tickets stay "coming soon" until the live provider keys are in: set to true to open booking.\n'
     'BUS_TICKETS_LIVE = env.bool("BUS_TICKETS_LIVE", default=False)\n'
     'CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")'),
])

patch("apps/seo/views.py", "BUS_TICKETS_LIVE", [
    ('    urls = [_url(absolute(p), changefreq=cf, priority=pr) for p, cf, pr, *_ in STATIC_PAGES]\n',
     '    # Bus tickets page joins the sitemap once booking is live.\n'
     '    hidden = set() if getattr(settings, "BUS_TICKETS_LIVE", False) else {"/travel/bus"}\n'
     '    urls = [_url(absolute(p), changefreq=cf, priority=pr) for p, cf, pr, *_ in STATIC_PAGES if p not in hidden]\n'),
], optional=True)

patch("apps/assistant/knowledge.py", "def bus_facts", [
    ('WHERE_TO_GO = """',
     '''# Bus tickets are "coming soon" until BUS_TICKETS_LIVE is switched on.
_BUS_LIVE_TEXT = """BUS TICKETS
- Search and book intercity bus tickets for travel across Nigeria: choose route and
  date, pick your seats, enter passenger details, and pay from wallet or by card
"""
_BUS_SOON_TEXT = """BUS TICKETS (COMING SOON)
- Intercity bus ticket booking is coming soon and can't be used yet. If asked,
  say it's launching soon and suggest flights or car hire in the meantime. Don't
  promise a launch date.
"""


def bus_facts() -> str:
    from django.conf import settings
    return _BUS_LIVE_TEXT if getattr(settings, "BUS_TICKETS_LIVE", False) else _BUS_SOON_TEXT


PLATFORM_FACTS = PLATFORM_FACTS.replace(_BUS_LIVE_TEXT, bus_facts())

WHERE_TO_GO = """'''),
], optional=True)

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done / not present: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nCommit and push; Render redeploys. Bus search/booking now answer \"coming soon\".")
