#!/usr/bin/env python3
"""
Mobile polish:
  1. Password-only login right after a new account is verified, and every time
     after (sign out, leaving the app, relaunch). The account is remembered as
     soon as someone registers.
  2. Drawer: springy open, profile + every menu item + socials cascade in, rows
     spring when pressed (also fixes rows losing their style on devices).
  3. Dashboard: entrance animation after login (header, greeting, wallet card,
     sections, tiles popping in); tiles spring when pressed.
All animations respect the phone's Reduce-motion setting.

Run from the mobile project root (the folder with app.json), after unzipping
oam-mobile-polish.zip there:

    python3 apply_mobile_polish.py --check    # preview
    python3 apply_mobile_polish.py            # apply (backs up edited files as *.bak-polish)
    python3 apply_mobile_polish.py --force    # also replace drawer/home if you edited them locally

Needs the earlier Welcome-back, Jobs and Assistant-launcher updates installed.
"""
import hashlib, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
FORCE = "--force" in sys.argv
changed, skipped, problems = [], [], []

# Files swapped in whole, only if unchanged since the versions this update was built on.
REPLACE = {
    "src/features/navigation/drawer.tsx": "9da7d7116cee0d8b97c7b595e8aca5c0c8daf7b38e227f1f30bbfd8b6bba7c70",
    "src/app/(app)/home.tsx": "45add60fe91b41b5eb52e06a584934e1805db63b12aeada9a20bc7ac1c8d4d53",
}

EDITS = [
    ("src/app/(auth)/sign-up.tsx", "rememberAccount", [
        ('import { authApi } from "@/features/auth";',
         'import { authApi, useAuthStore } from "@/features/auth";'),
        ('  const register = useMutation({',
         '  const rememberAccount = useAuthStore((s) => s.rememberAccount);\n\n  const register = useMutation({'),
        ('''    onSuccess: () => {
      router.push({ pathname: "/verify-otp", params: { identifier: email.trim().toLowerCase() } });''',
         '''    onSuccess: () => {
      // Remember the new account now, so leaving mid-signup still lands on Welcome back.
      const mail = email.trim().toLowerCase();
      rememberAccount({ name: firstName.trim(), identifier: mail, email: mail, phone: phone.trim() || null, provider: "email" }).catch(() => {});
      router.push({ pathname: "/verify-otp", params: { identifier: mail } });'''),
    ]),
    ("src/app/(auth)/verify-otp.tsx", "completeVerification", [
        ('  const setSession = useAuthStore((s) => s.setSession);\n  const { identifier } = useLocalSearchParams<{ identifier: string }>();',
         '  const setSession = useAuthStore((s) => s.setSession);\n'
         '  const completeVerification = useAuthStore((s) => s.completeVerification);\n'
         '  // next="home": came from a login attempt (password already typed) → straight in.\n'
         '  // Otherwise (fresh signup) → Welcome back, to log in with the password.\n'
         '  const { identifier, next } = useLocalSearchParams<{ identifier: string; next?: string }>();'),
        ('''      await setSession(user, tokens);
      router.replace("/home");''',
         '''      if (next === "home") {
        await setSession(user, tokens);
        router.replace("/home");
      } else {
        await completeVerification(user, tokens);
        router.replace("/welcome-back");
      }'''),
    ]),
    ("src/app/(auth)/sign-in.tsx", 'next: "home"', [
        ('router.push({ pathname: "/verify-otp", params: { identifier: identifier.trim() } });',
         'router.push({ pathname: "/verify-otp", params: { identifier: identifier.trim(), next: "home" } });'),
    ]),
]


def backup(p: Path):
    bak = p.with_name(p.name + ".bak-polish")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)

def do_replace(rel, base_sha):
    cur, new = ROOT / rel, ROOT / (rel + ".new")
    if not new.exists():
        if cur.exists() and "@/shared/ui/motion" in cur.read_text(encoding="utf-8"):
            skipped.append(rel); return
        problems.append(f"{rel}.new missing — unzip oam-mobile-polish.zip here first"); return
    if cur.exists() and cur.read_bytes() == new.read_bytes():
        skipped.append(rel)
        if not CHECK: new.unlink()
        return
    if cur.exists() and hashlib.sha256(cur.read_bytes()).hexdigest() != base_sha and not FORCE:
        problems.append(f"{rel} has local changes — not replaced. Compare with {rel}.new, "
                        "or re-run with --force (a backup is kept).")
        return
    changed.append(rel)
    if CHECK: return
    backup(cur)
    shutil.move(str(new), str(cur))

def do_edits(rel, marker, pairs):
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found"); return
    s = p.read_text(encoding="utf-8")
    if marker in s:
        skipped.append(rel); return
    for a, b in pairs:
        if a not in s:
            problems.append(f"{rel}: couldn't find: {a.strip().splitlines()[0][:80]}"); return
        s = s.replace(a, b, 1)
    changed.append(rel)
    if CHECK: return
    backup(p)
    p.write_text(s, encoding="utf-8")

def main():
    if not (ROOT / "app.json").exists():
        sys.exit("Run this from the mobile project root (the folder with app.json).")
    for f in ("src/shared/ui/motion.tsx", "src/app/(auth)/welcome-back.tsx", "src/shared/auth/account-store.ts"):
        if not (ROOT / f).exists():
            sys.exit(f"{f} is missing — install the Welcome-back update and unzip oam-mobile-polish.zip first.")
    for rel, sha in REPLACE.items():
        do_replace(rel, sha)
    for rel, marker, pairs in EDITS:
        do_edits(rel, marker, pairs)
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for x in problems:
            print("  - " + x)
        sys.exit(2)
    print("\nNext: npx expo start -c   (or: eas update)")

if __name__ == "__main__":
    main()
