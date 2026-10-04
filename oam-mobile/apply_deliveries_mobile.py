#!/usr/bin/env python
"""
Wire Delivery & Dispatch into the OAM mobile app.

Run from the mobile root (the folder with app.json):

    python apply_deliveries_mobile.py            # apply
    python apply_deliveries_mobile.py --check    # show what would change

Idempotent; each edited file is backed up once as <file>.bak-deliveries.

What it changes
  src/app/(app)/_layout.tsx              register the 7 delivery/rider screens (hidden tabs)
  src/app/_layout.tsx                    tapping a delivery notification opens the right screen
  src/app/(app)/home.tsx                 + "Send Package" service tile
  src/features/navigation/drawer.tsx     + "Send a Package" and "Ride & Earn" drawer links
  src/shared/i18n/locales/en.json        + labels for the tile and drawer links
No new native modules (map = Leaflet in the existing WebView; location = expo-location),
so this ships with `eas update` — no new store build needed.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
changed, skipped, problems = [], [], []

SCREENS = ["deliveries", "delivery-new", "delivery", "rider", "rider-apply", "rider-job", "rider-earnings"]


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


def edit(rel, marker, replacements):
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: not found")
        return
    if marker in text:
        skipped.append(rel)
        return
    for old, new in replacements:
        if old not in text:
            problems.append(f"{rel}: couldn't find {old.strip()[:70]!r}")
            return
        text = text.replace(old, new, 1)
    write(rel, text)


EN = {
    ("dashboard", "services", "delivery"): "Send Package",
    ("drawer", "deliveries"): "Send a Package",
    ("drawer", "rider"): "Ride & Earn",
}


def patch_en():
    rel = "src/shared/i18n/locales/en.json"
    raw = read(rel)
    if raw is None:
        problems.append(f"{rel}: not found")
        return
    data = json.loads(raw)
    added = 0
    for path, value in EN.items():
        node = data
        for k in path[:-1]:
            node = node.setdefault(k, {})
        if path[-1] not in node:
            node[path[-1]] = value
            added += 1
    if not added:
        skipped.append(rel)
        return
    write(rel, json.dumps(data, indent=2, ensure_ascii=False) + ("\n" if raw.endswith("\n") else ""))


def main():
    if not (ROOT / "app.json").exists():
        print("Run this from the mobile root (the folder containing app.json).")
        sys.exit(1)
    if not (ROOT / "src/features/deliveries/api.ts").exists():
        print("src/features/deliveries is missing — unzip oam-deliveries-mobile.zip here first.")
        sys.exit(1)

    screens = "".join(f'      <Tabs.Screen name="{s}" options={{{{ href: null, tabBarStyle: {{ display: "none" }} }}}} />\n'
                      for s in SCREENS)
    edit("src/app/(app)/_layout.tsx", 'name="rider-job"', [
        ("    </Tabs>\n", "      {/* oam-deliveries: Delivery & Dispatch screens */}\n" + screens + "    </Tabs>\n"),
    ])

    edit("src/app/_layout.tsx", "useDeliveriesPushRouting", [
        ('import { useJobsPushRouting } from "@/features/jobs"; // oam-jobs\n',
         'import { useJobsPushRouting } from "@/features/jobs"; // oam-jobs\n'
         'import { useDeliveriesPushRouting } from "@/features/deliveries/push-routing"; // oam-deliveries\n'),
        ('  useJobsPushRouting(status === "authenticated");\n',
         '  useJobsPushRouting(status === "authenticated");\n'
         '  // oam-deliveries: delivery / rider notifications.\n'
         '  useDeliveriesPushRouting(status === "authenticated");\n'),
    ])

    edit("src/app/(app)/home.tsx", '"delivery"', [
        ("type LucideIcon, BriefcaseBusiness", "type LucideIcon, BriefcaseBusiness, PackageCheck"),
        ('      { id: "jobs", lkey: "jobs", label: "Jobs", Icon: BriefcaseBusiness, tint: "green" },\n',
         '      { id: "jobs", lkey: "jobs", label: "Jobs", Icon: BriefcaseBusiness, tint: "green" },\n'
         '      { id: "delivery", lkey: "delivery", label: "Send Package", Icon: PackageCheck, tint: "green" },\n'),
        ('    if (id === "jobs") return router.push("/jobs" as never);\n',
         '    if (id === "jobs") return router.push("/jobs" as never);\n'
         '    if (id === "delivery") return router.push("/deliveries" as never);\n'),
    ])

    edit("src/features/navigation/drawer.tsx", '"/rider"', [
        ("type LucideIcon, BriefcaseBusiness\n", "type LucideIcon, BriefcaseBusiness, PackageCheck, Bike\n"),
        ('    { key: "jobs", label: t("drawer.jobs", "Jobs & Careers"), Icon: BriefcaseBusiness, onPress: () => go("/jobs") },\n',
         '    { key: "jobs", label: t("drawer.jobs", "Jobs & Careers"), Icon: BriefcaseBusiness, onPress: () => go("/jobs") },\n'
         '    { key: "deliveries", label: t("drawer.deliveries", "Send a Package"), Icon: PackageCheck, onPress: () => go("/deliveries") },\n'
         '    { key: "rider", label: t("drawer.rider", "Ride & Earn"), Icon: Bike, onPress: () => go("/rider") },\n'),
    ])

    patch_en()

    verb = "Would change" if CHECK else "Changed"
    print(f"{verb}: " + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: npx tsc --noEmit, then  eas update --branch production --message \"Deliveries\"")


if __name__ == "__main__":
    main()
