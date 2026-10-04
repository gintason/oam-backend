#!/usr/bin/env python
"""
Wire Delivery & Dispatch into the OAM web app.

Run from the frontend root (the folder with package.json):

    python apply_deliveries_frontend.py            # apply
    python apply_deliveries_frontend.py --check    # show what would change

Idempotent; each edited file is backed up once as <file>.bak-deliveries.

What it changes
  src/App.tsx                      + {deliveriesRoutes}
  src/pages/Dashboard.tsx          + "Send Package" service tile
  src/components/AppHeader.tsx     + "Dispatch" nav link for staff
  src/i18n/locales/en.json         + header.nav.dispatch
  src/pages/jobs/JobsPaymentReturn.tsx   DLV- card returns go to /deliveries/payment-return
No new npm packages: the map (Leaflet + OpenStreetMap) loads from a CDN on demand.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
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


def edit(rel, marker, replacements, optional=False):
    """Apply [(old, new)] once each. Skip the file if `marker` is already present."""
    text = read(rel)
    if text is None:
        (skipped if optional else problems).append(f"{rel}: not found")
        return
    if marker in text:
        skipped.append(rel)
        return
    for old, new in replacements:
        if old not in text:
            (skipped if optional else problems).append(f"{rel}: couldn't find {old.strip()[:60]!r}")
            return
        text = text.replace(old, new, 1)
    write(rel, text)


def main():
    if not (ROOT / "package.json").exists():
        print("Run this from the frontend root (the folder containing package.json).")
        sys.exit(1)
    if not (ROOT / "src/routes/deliveriesRoutes.tsx").exists():
        print("src/routes/deliveriesRoutes.tsx is missing — unzip oam-deliveries-frontend.zip here first.")
        sys.exit(1)

    edit("src/App.tsx", "deliveriesRoutes", [
        ('import { jobsRoutes } from "./routes/jobsRoutes";\n',
         'import { jobsRoutes } from "./routes/jobsRoutes";\n'
         '// oam-deliveries: Delivery & Dispatch\n'
         'import { deliveriesRoutes } from "./routes/deliveriesRoutes";\n'),
        ("              {jobsRoutes}\n",
         "              {jobsRoutes}\n\n              {/* oam-deliveries */}\n              {deliveriesRoutes}\n"),
    ])

    edit("src/pages/Dashboard.tsx", '"/deliveries/new"', [
        (', BriefcaseBusiness } from "lucide-react";', ', BriefcaseBusiness, PackageCheck } from "lucide-react";'),
        ('{ to: "/marketplace", icon: <Store size={20} strokeWidth={1.75} />, label: t("dashboard.services.marketplace"), tint: "green" },',
         '{ to: "/marketplace", icon: <Store size={20} strokeWidth={1.75} />, label: t("dashboard.services.marketplace"), tint: "green" },\n'
         '                  { to: "/deliveries/new", icon: <PackageCheck size={20} strokeWidth={1.75} />, label: t("dashboard.services.delivery", "Send Package"), tint: "green" },'),
    ])

    edit("src/components/AppHeader.tsx", "/admin/dispatch", [
        ('? [...NAV, { key: "earnings", to: "/earnings", inTabs: false }]',
         '? [...NAV, { key: "earnings", to: "/earnings", inTabs: false }, { key: "dispatch", to: "/admin/dispatch", inTabs: false }]'),
    ])

    edit("src/i18n/locales/en.json", '"dispatch": "Dispatch"', [
        ('      "earnings": "Earnings"\n    },', '      "earnings": "Earnings",\n      "dispatch": "Dispatch"\n    },'),
    ])

    edit("src/pages/jobs/JobsPaymentReturn.tsx", "/deliveries/payment-return", [
        ('  return ref.startsWith("JOB-") ? <JobsPaymentReturn /> : <>{fallback}</>;',
         '  if (ref.startsWith("DLV-")) {  // oam-deliveries: delivery card payments\n'
         '    window.location.replace(`/deliveries/payment-return?${params.toString()}`);\n'
         '    return null;\n'
         '  }\n'
         '  return ref.startsWith("JOB-") ? <JobsPaymentReturn /> : <>{fallback}</>;'),
    ], optional=True)

    verb = "Would change" if CHECK else "Changed"
    print(f"{verb}: " + (", ".join(changed) or "nothing"))
    if skipped:
        print("Skipped / already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: npm run build   (no npm install needed)")


if __name__ == "__main__":
    main()
