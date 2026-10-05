#!/usr/bin/env python
"""
Three mobile fixes. Run from the mobile root (the folder with app.json):

    python3 apply_mobile_nav_fix.py

  src/app/(app)/_layout.tsx   Back returns to the screen you came from
                              (tabs defaulted to "first route" = Notifications)
  src/app/(app)/home.tsx      service tile labels wrap to 2 lines and shrink to fit
                              ("Marketplace", "Send Package", "Fund Betting", "Refer & Earn")
  src/app/_layout.tsx         silence a harmless dev-only warning from expo-router's
                              internal link handling in the terminal (LogBox already hid it)
Backups: *.bak-navfix. Ships with `eas update`.
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
    bak = p.with_name(p.name + ".bak-navfix")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "app.json").exists():
    print("Run this from the mobile root (the folder containing app.json).")
    sys.exit(1)

patch("src/app/(app)/_layout.tsx", "backBehavior", [
    ("    <Tabs\n      screenOptions={{",
     '    <Tabs\n      backBehavior="history"   // Back = previous screen (default was the first tab: Notifications)\n      screenOptions={{'),
])

patch("src/app/(app)/home.tsx", "adjustsFontSizeToFit", [
    ('''      <Text variant="caption" color="ink" numberOfLines={1}>
        {label}
      </Text>''',
     '''      <Text
        variant="caption"
        color="ink"
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ textAlign: "center", fontSize: 12.5, lineHeight: 15, minHeight: 30, paddingHorizontal: 4 }}
      >
        {label}
      </Text>'''),
])

patch("src/app/_layout.tsx", "__oamFilteredConsole", [
    ('''LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);''',
     '''LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);
// Dev-only: that warning comes from expo-router's own link handling (useLinking),
// not app code, and is harmless; keep it out of the Metro terminal too.
if (__DEV__ && !(globalThis as { __oamFilteredConsole?: boolean }).__oamFilteredConsole) {
  (globalThis as { __oamFilteredConsole?: boolean }).__oamFilteredConsole = true;
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("hasn't mounted yet")) return;
    original(...args);
  };
}'''),
])

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print('\nNext: eas update --channel production --message "Tiles, back button, dev warning"')
