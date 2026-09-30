#!/usr/bin/env python3
"""
Hero phones → the real OAM mobile dashboard (Android in ₦, iPhone in $).

Run from the frontend folder (the one with package.json), after unzipping
oam-hero-dashboard-frontend.zip there. The zip holds the new file as
src/Hero.tsx.new; this script swaps it in only if your current src/Hero.tsx
is the version this update was built from (so no local edits get lost).

    python3 apply_hero_dashboard.py            # apply (backs up src/Hero.tsx.bak-hero)
    python3 apply_hero_dashboard.py --force    # replace even if Hero.tsx was edited locally
"""
import hashlib, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CUR, NEW = ROOT / "src/Hero.tsx", ROOT / "src/Hero.tsx.new"
BASE_SHA256 = "c868b15615a854dee0a12a595e0f0c35f5e16d53be3f006f6f5060d97ee7cf30"

if not (ROOT / "package.json").exists():
    sys.exit("Run this from the frontend folder (the one with package.json).")
if not NEW.exists():
    sys.exit("src/Hero.tsx.new is missing — unzip oam-hero-dashboard-frontend.zip here first.")
if CUR.exists() and CUR.read_bytes() == NEW.read_bytes():
    print("Already done: src/Hero.tsx"); NEW.unlink(); sys.exit(0)
if CUR.exists():
    sha = hashlib.sha256(CUR.read_bytes()).hexdigest()
    if sha != BASE_SHA256 and "--force" not in sys.argv:
        sys.exit("src/Hero.tsx has local changes since this update was made — nothing replaced.\n"
                 "Compare it with src/Hero.tsx.new, or run with --force to replace it (a backup is kept).")
    bak = CUR.with_name("Hero.tsx.bak-hero")
    if not bak.exists():
        shutil.copy2(CUR, bak)
shutil.move(str(NEW), str(CUR))
print("Changed: src/Hero.tsx  (backup: src/Hero.tsx.bak-hero)\n\nNext: npm run build")
