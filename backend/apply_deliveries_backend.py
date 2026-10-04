#!/usr/bin/env python
"""
Wire the Delivery & Dispatch app (apps/deliveries) into the OAM backend.

Run from the backend root (the folder with manage.py):

    python apply_deliveries_backend.py            # apply
    python apply_deliveries_backend.py --check    # show what would change, write nothing

Safe to run more than once: every edit is guarded by a marker and skipped if
it's already there. Each edited file is backed up once as <file>.bak-deliveries.

What it changes
  config/settings/base.py       + "apps.deliveries" in INSTALLED_APPS, DELIVERIES_* settings
  config/urls.py                + /api/v1/deliveries/
  apps/uploads/purposes.py      + rider_document, rider_photo, delivery_proof
  apps/payments/views.py        forward DLV- card references from the main webhooks
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
MARK = "# [oam-deliveries]"
changed, skipped, problems = [], [], []


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else None


def write(rel, text):
    p = ROOT / rel
    if CHECK:
        changed.append(rel)
        return
    bak = p.with_name(p.name + ".bak-deliveries")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")
    changed.append(rel)


def need(rel):
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: file not found")
    return text


SETTINGS_BLOCK = f'''

{MARK} ------------------------------------------------------------------
# Delivery & Dispatch
# --------------------------------------------------------------------------
# Card payments for deliveries (wallet payments need no gateway).
DELIVERIES_PAYMENT_GATEWAY = env("DELIVERIES_PAYMENT_GATEWAY", default="flutterwave")
# Secret for POST /api/v1/deliveries/internal/tick/ (falls back to JOBS_CRON_SECRET).
DELIVERIES_CRON_SECRET = env("DELIVERIES_CRON_SECRET", default="")
'''


def patch_settings():
    rel = "config/settings/base.py"
    text = need(rel)
    if text is None:
        return
    if '"apps.deliveries"' in text:
        skipped.append(rel)
        return
    anchor = (re.search(r'^\s*"apps\.jobs",.*$', text, flags=re.M)
              or re.search(r'^\s*"apps\.reloadly",\s*$', text, flags=re.M))
    if not anchor:
        problems.append(f'{rel}: couldn\'t find "apps.jobs" or "apps.reloadly" in INSTALLED_APPS')
        return
    line = anchor.group(0)
    text = text.replace(line, line + f'\n    "apps.deliveries",  {MARK} delivery & dispatch', 1)
    text = text.rstrip() + "\n" + SETTINGS_BLOCK
    write(rel, text)


def patch_urls():
    rel = "config/urls.py"
    text = need(rel)
    if text is None:
        return
    if "apps.deliveries.urls" in text:
        skipped.append(rel)
        return
    for anchor in ('path("api/v1/jobs/", include("apps.jobs.urls")),',
                   'path("api/v1/notifications/", include("apps.notifications.urls")),'):
        m = re.search(re.escape(anchor) + r".*$", text, flags=re.M)
        if m:
            text = text.replace(m.group(0), m.group(0) +
                                f'\n    path("api/v1/deliveries/", include("apps.deliveries.urls")),'
                                f'  {MARK}', 1)
            write(rel, text)
            return
    problems.append(f"{rel}: couldn't find the jobs or notifications url line")


PURPOSES_BLOCK = f'''

{MARK} Delivery & Dispatch uploads
PURPOSES.update({{
    "rider_document": Purpose(
        key="rider_document",
        folder="oam/deliveries/rider-docs",
        resource_type="image",
        delivery_type="upload",
        max_bytes=10 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic", "pdf"],
        label="Rider document",
        hint="A clear photo or PDF, up to 10 MB.",
    ),
    "rider_photo": Purpose(
        key="rider_photo",
        folder="oam/deliveries/rider-photos",
        resource_type="image",
        delivery_type="upload",
        max_bytes=5 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic"],
        label="Rider photo",
        min_width=200,
        min_height=200,
    ),
    "delivery_proof": Purpose(
        key="delivery_proof",
        folder="oam/deliveries/proof",
        resource_type="image",
        delivery_type="upload",
        max_bytes=8 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic"],
        label="Proof of delivery",
    ),
}})
'''


def patch_purposes():
    rel = "apps/uploads/purposes.py"
    text = need(rel)
    if text is None:
        return
    if '"rider_document"' in text:
        skipped.append(rel)
        return
    write(rel, text.rstrip() + "\n" + PURPOSES_BLOCK)


def patch_payment_webhooks():
    rel = "apps/payments/views.py"
    text = need(rel)
    if text is None:
        return
    if "apps.deliveries" in text:
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
                    f"            try:  {MARK} delivery card payments\n"
                    "                from apps.deliveries.services import PaymentService as _DlvPay\n"
                    f"                _DlvPay.confirm_by_reference({ref_expr})\n"
                    "            except Exception:\n"
                    "                pass\n")
            text = text.replace(line, hook, 1)
            done += 1
    if done == 0:
        problems.append(f"{rel}: webhook settle lines not found — delivery card payments will rely "
                        "on the app's verify-payment call and the tick")
        return
    write(rel, text)


STEPS = """
Next:
  local:   python manage.py migrate deliveries && python manage.py test apps.deliveries
  Render:  push — build.sh runs `migrate`, so the delivery tables are created on deploy.

Optional (recommended) on Render -> oam-api -> Environment:
  DELIVERIES_CRON_SECRET = <any long random string>   (or reuse JOBS_CRON_SECRET)
then point a free scheduler (cron-job.org) at
  POST https://api.oam-app.com/api/v1/deliveries/internal/tick/   header X-Cron-Secret: <secret>
every minute. Dispatch also advances whenever the apps poll, so this is a safety net.

Make yourself an admin to see the Dispatch dashboard:  is_staff = True on your user.
"""


def main():
    if not (ROOT / "manage.py").exists():
        print("Run this from the backend root (the folder containing manage.py).")
        sys.exit(1)
    if not (ROOT / "apps" / "deliveries" / "models.py").exists():
        print("apps/deliveries is missing — unzip oam-deliveries-backend.zip into this folder first.")
        sys.exit(1)
    for fn in (patch_settings, patch_urls, patch_purposes, patch_payment_webhooks):
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
    print(STEPS)


if __name__ == "__main__":
    main()
