#!/usr/bin/env python
"""
Fix: returning users sometimes land on the full Sign-in screen instead of the
password-only "Welcome back" screen.

Cause: the entry screen rendered (under the splash) before the remembered
account had finished loading, and redirected to /sign-in while auth was still
"loading"; nothing moved them on once the account loaded.

Run from the mobile root:  python3 apply_signin_fix.py
  src/app/index.tsx           wait for the account to load before routing
  src/app/(auth)/_layout.tsx  a remembered account on /sign-in goes to Welcome back
Backups: *.bak-signin. Ships with `eas update`.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def patch(rel, marker, reps):
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:60]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-signin")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


patch("src/app/index.tsx", 'status === "loading"', [
    ('  if (firstRun === null) return null;',
     '  // Wait for the remembered account to load — routing earlier sent returning\n'
     '  // users to the full sign-in screen instead of Welcome back.\n'
     '  if (status === "loading" || firstRun === null) return null;'),
])

patch("src/app/(auth)/_layout.tsx", "usePathname", [
    ('import { Redirect, Stack } from "expo-router";', 'import { Redirect, Stack, usePathname } from "expo-router";'),
    ('  const status = useAuthStore((s) => s.status);',
     '  const status = useAuthStore((s) => s.status);\n  const pathname = usePathname();'),
    ('  if (status === "authenticated") return <Redirect href="/home" />;',
     '  if (status === "authenticated") return <Redirect href="/home" />;\n'
     '  // A remembered account always gets the password-only screen, never the full sign-in.\n'
     '  if (status === "locked" && pathname === "/sign-in") return <Redirect href="/welcome-back" />;'),
])

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
