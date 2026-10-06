#!/usr/bin/env python
"""
Home page: replace the closing "One app. Endless possibilities." CTA with the
OAM Dispatch (delivery) section — rider-on-a-bike illustration, three steps,
payment options, "Send a package" / "Track a delivery" buttons.

Unzip oam-web-delivery-section.zip in the frontend root first, then:
    python3 apply_delivery_section.py

  src/sections/DeliverySection.tsx   (from the zip) the new section
  src/LandingPage.tsx                uses it instead of <CTA />, adds a "Delivery" nav link
  src/i18n/locales/en.json           its English text (other languages fall back to it)
Backups: *.bak-dlvsection
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def backup(p):
    bak = p.with_name(p.name + ".bak-dlvsection")
    if not bak.exists():
        shutil.copy2(p, bak)


if not (ROOT / "package.json").exists() or not (ROOT / "src/LandingPage.tsx").exists():
    print("Run this from the frontend root (the folder containing package.json and src/LandingPage.tsx).")
    sys.exit(1)
if not (ROOT / "src/sections/DeliverySection.tsx").exists():
    print("src/sections/DeliverySection.tsx is missing — unzip oam-web-delivery-section.zip here first.")
    sys.exit(1)

lp = ROOT / "src/LandingPage.tsx"
t = lp.read_text(encoding="utf-8")
if "<DeliverySection />" in t:
    skipped.append("src/LandingPage.tsx")
else:
    reps = [
        ('import { CTA, Footer } from "./sections/CTAFooter";',
         'import { Footer } from "./sections/CTAFooter";\nimport { DeliverySection } from "./sections/DeliverySection";'),
        ("        <CTA />", "        <DeliverySection />"),
        ('  { key: "services", href: "#services" },',
         '  { key: "services", href: "#services" },\n  { key: "delivery", href: "#delivery" },'),
    ]
    for old, new in reps:
        if old not in t:
            problems.append(f"src/LandingPage.tsx: couldn't find {old.strip()!r} — send me the file")
            break
        t = t.replace(old, new, 1)
    else:
        backup(lp)
        lp.write_text(t, encoding="utf-8")
        changed.append("src/LandingPage.tsx")

STRINGS = {
    "nav": {"delivery": "Delivery"},
    "delivery": {
        "eyebrow": "OAM Dispatch",
        "title": "Send a package across town — today.",
        "subtitle": "Documents, food, parcels or market goods: book a nearby rider in a minute and we'll get it there the same day, safely.",
        "steps": {
            "price": {"title": "Instant, upfront price",
                      "desc": "Enter pickup, drop-off and package size — you see the fare before you pay."},
            "match": {"title": "A verified rider accepts",
                      "desc": "The nearest approved rider on a bike, car or van is matched automatically."},
            "track": {"title": "Track it to the door",
                      "desc": "Follow the rider live on the map. Hand-over is confirmed with a delivery code."},
        },
        "payWith": "Pay with",
        "pay": {"wallet": "OAM Wallet", "card": "Card", "onDelivery": "Pay on delivery", "cash": "Cash"},
        "send": "Send a package",
        "track": "Track a delivery",
    },
}


def merge(dst, src):
    n = 0
    for k, v in src.items():
        if isinstance(v, dict):
            if not isinstance(dst.get(k), dict):
                dst[k] = {}
            n += merge(dst[k], v)
        elif k not in dst:
            dst[k] = v
            n += 1
    return n


loc = ROOT / "src/i18n/locales/en.json"
if loc.exists():
    raw = loc.read_text(encoding="utf-8")
    data = json.loads(raw)
    if merge(data.setdefault("landing", {}), STRINGS):
        backup(loc)
        loc.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        changed.append("src/i18n/locales/en.json")
    else:
        skipped.append("en.json")
else:
    problems.append("src/i18n/locales/en.json: not found")

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nCommit and push; the site redeploys.")
