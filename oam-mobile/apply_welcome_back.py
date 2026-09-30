#!/usr/bin/env python3
"""
Replace the unlock-PIN system with a password-only "Welcome back" screen.

Run from the mobile project root (the folder with app.json), after unzipping
oam-welcome-back-mobile.zip there:

    python3 apply_welcome_back.py --check    # preview, writes nothing
    python3 apply_welcome_back.py            # apply

Safe to run more than once. Each edited file is backed up once as
<file>.bak-welcome. The wallet's transaction PIN is not touched.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
changed, skipped, removed, problems = [], [], [], []

# (file, [(old, new), ...]) — each old snippet is from the PIN version.
EDITS: list[tuple[str, list[tuple[str, str]]]] = [
    ("src/app/_layout.tsx", [
        ('import { AppSplash } from "@/features/splash/AppSplash";',
         'import { AppSplash } from "@/features/splash/AppSplash";\n'
         'import { markSplashDone } from "@/features/splash/splash-state";'),
        ("    if (ready) SplashScreen.hideAsync();",
         "    if (ready) {\n      SplashScreen.hideAsync();\n"
         "      markSplashDone();   // lets entry animations start once the splash is gone\n    }"),
    ]),
    ("src/app/index.tsx", [
        ('if (status === "locked") return <Redirect href="/unlock" />;',
         'if (status === "locked") return <Redirect href="/welcome-back" />;'),
        ("Entry router. Signed-in users go home; a saved PIN goes to unlock.",
         "Entry router. Signed-in users go home; a remembered account goes to Welcome back (password only)."),
    ]),
    ("src/app/(auth)/_layout.tsx", [
        ("  const pendingPin = useAuthStore((s) => s.pendingPin);\n", ""),
        ('return <Redirect href={pendingPin ? "/create-pin" : "/home"} />;', 'return <Redirect href="/home" />;'),
    ]),
    ("src/app/(app)/_layout.tsx", [
        ('if (status === "locked") return <Redirect href="/unlock" />;',
         'if (status === "locked") return <Redirect href="/welcome-back" />;'),
        ('      <Tabs.Screen name="create-pin" options={{ href: null, tabBarStyle: { display: "none" } }} />\n', ""),
    ]),
    ("src/app/(auth)/sign-in.tsx", [
        ('import { pinVault } from "@/shared/auth/pin-store";\n', ""),
        ("  const beginPinSetup = useAuthStore((s) => s.beginPinSetup);\n", ""),
        ('''      await setSession(user, tokens);
      // First login on this device (no unlock PIN yet)? Set one up, so the user
      // can unlock with a PIN on every launch afterwards.
      if (await pinVault.has()) {
        router.replace("/home");
      } else {
        beginPinSetup();
        router.replace("/create-pin");
      }''', '''      // Also remembers the account, so next launch only asks for the password.
      await setSession(user, tokens);
      router.replace("/home");'''),
    ]),
    ("src/app/(auth)/verify-otp.tsx", [
        ("  const beginPinSetup = useAuthStore((s) => s.beginPinSetup);\n", ""),
        ('''      await setSession(user, tokens);
      beginPinSetup();
      router.replace("/create-pin");''', '''      await setSession(user, tokens);
      router.replace("/home");'''),
    ]),
    ("src/app/(auth)/forgot-password.tsx", [
        ('import { Link, useRouter } from "expo-router";',
         'import { Link, useLocalSearchParams, useRouter } from "expo-router";'),
        ('  const [identifier, setIdentifier] = useState("");',
         '  // Prefilled when opened from Welcome back.\n'
         '  const params = useLocalSearchParams<{ identifier?: string }>();\n'
         '  const [identifier, setIdentifier] = useState(String(params.identifier ?? ""));'),
        ('onSuccess: () => router.replace("/sign-in"),',
         'onSuccess: () => router.replace("/"),   // index decides: Welcome back or Sign in'),
    ]),
    ("src/app/(app)/profile.tsx", [
        ("  const lock = useAuthStore((s) => s.lock);\n",
         "  const switchAccount = useAuthStore((s) => s.switchAccount);\n"),
        ('<Button title={t("profile.lock", "Lock app")} onPress={lock} style={{ marginTop: 24 }} />\n'
         '        <Button title={t("profile.signOut", "Sign out")} variant="secondary" onPress={signOut} style={{ marginTop: 12 }} />',
         '<Button title={t("profile.signOut", "Sign out")} onPress={signOut} style={{ marginTop: 24 }} />\n'
         '        <Button title={t("profile.switchAccount", "Switch account")} variant="secondary" onPress={switchAccount} style={{ marginTop: 12 }} />'),
        ('{t("profile.lockHint", "Lock keeps you signed in — return with your PIN. Sign out switches account (asks for email & password).")}',
         '{t("profile.signOutHint", "Sign out keeps your account on this device — come back with just your password. '
         'Switch account removes it (asks for email & password).")}'),
    ]),
]

# PIN screens and helpers that are no longer used.
REMOVE = [
    "src/app/(auth)/unlock.tsx",
    "src/app/(app)/create-pin.tsx",
    "src/features/auth/ui/PinPad.tsx",
    "src/shared/auth/pin-store.ts",
]

# Must be present from the zip.
REQUIRED = [
    "src/shared/auth/account-store.ts",
    "src/features/auth/model/auth-store.ts",
    "src/features/auth/ui/WelcomeArt.tsx",
    "src/features/splash/splash-state.ts",
    "src/features/auth/ui/SocialAuthButtons.tsx",
    "src/app/(auth)/welcome-back.tsx",
]


def apply_edits(rel: str, pairs: list[tuple[str, str]]) -> None:
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    text = p.read_text(encoding="utf-8")
    new = text
    missing = []
    for old, rep in pairs:
        if rep.strip() and rep in new:
            continue                       # already applied (check first: rep may contain old)
        if old in new:
            new = new.replace(old, rep)
        elif not rep.strip():
            continue                       # removal already done
        else:
            missing.append(old.strip().splitlines()[0][:70])
    if missing:
        problems.append(f"{rel}: couldn't find: " + " | ".join(missing))
    if new == text:
        if not missing:
            skipped.append(rel)
        return
    changed.append(rel)
    if not CHECK:
        bak = p.with_name(p.name + ".bak-welcome")
        if not bak.exists():
            shutil.copy2(p, bak)
        p.write_text(new, encoding="utf-8")


def main() -> None:
    if not (ROOT / "app.json").exists():
        sys.exit("Run this from the mobile project root (the folder with app.json).")
    missing = [r for r in REQUIRED if not (ROOT / r).exists()]
    if missing:
        sys.exit("Unzip oam-welcome-back-mobile.zip here first. Missing: " + ", ".join(missing))

    for rel, pairs in EDITS:
        apply_edits(rel, pairs)
    for rel in REMOVE:
        p = ROOT / rel
        if p.exists():
            removed.append(rel)
            if not CHECK:
                p.unlink()

    # Anything else still pointing at the PIN system?
    leftovers = []
    for f in (ROOT / "src").rglob("*.ts*"):
        if f.suffix not in (".ts", ".tsx"):
            continue
        s = f.read_text(encoding="utf-8", errors="ignore")
        for needle in ("pinVault", "beginPinSetup", "pendingPin", "PinPad", "/create-pin", '"/unlock"', "s.lock)"):
            if needle in s and not CHECK:
                leftovers.append(f"{f.relative_to(ROOT)} ({needle})")
    if leftovers:
        problems.append("still references the old PIN code: " + ", ".join(sorted(set(leftovers))))

    verb = "Would" if CHECK else ""
    print(f"{verb + ' change' if CHECK else 'Changed'}: " + (", ".join(changed) or "nothing"))
    print(f"{verb + ' remove' if CHECK else 'Removed'}: " + (", ".join(removed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: npx expo start -c   (sign in once; reopen the app to see Welcome back)")


if __name__ == "__main__":
    main()
