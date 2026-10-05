#!/usr/bin/env python
"""
Fix: the keyboard covers the field you're typing in (Android, edge-to-edge).

Run from the mobile root (the folder with app.json):
    python3 apply_keyboard_fix.py            # apply
    python3 apply_keyboard_fix.py --check    # preview

What it changes (backups: *.bak-keyboard)
  src/shared/ui/keyboard.tsx      (from the zip) measures the keyboard overlap
  src/shared/ui/Screen.tsx        every screen shrinks above the keyboard on Android
  bottom-sheet modals             (found automatically) lift above the keyboard
  KeyboardAvoidingViews that used "height" on Android: now iOS-only, so the
  space isn't added twice
  src/app/(app)/artisan-register.tsx   city: type any city worldwide (+ suggestions, GPS)
Ships with `eas update` — no new build.
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
CHECK = "--check" in sys.argv
changed, skipped, problems = [], [], []
IMPORT = 'import { KeyboardAware } from "@/shared/ui/keyboard";'

SCREEN = '''import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";
import { KeyboardAware } from "./keyboard";

/**
 * Safe-area screen container on the paper surface.
 * On Android it also shrinks above the on-screen keyboard (edge-to-edge
 * windows don't resize for it), so the field you're typing in stays visible.
 */
export function Screen({
  children,
  edges = ["top", "bottom"],
  className,
}: {
  children: ReactNode;
  edges?: readonly Edge[];
  className?: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={edges}>
      <KeyboardAware enabled={Platform.OS === "android"}>
        <View style={{ flex: 1 }} className={className}>
          {children}
        </View>
      </KeyboardAware>
    </SafeAreaView>
  );
}
'''


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def write(p: Path, text: str):
    if CHECK:
        changed.append(rel(p))
        return
    bak = p.with_name(p.name + ".bak-keyboard")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")
    changed.append(rel(p))


def add_import(text: str) -> str:
    if IMPORT in text:
        return text
    imports = list(re.finditer(r'^import [^;]*?;[ \t]*$', text, flags=re.M | re.S))
    if not imports:
        return IMPORT + "\n" + text
    end = imports[-1].end()
    return text[:end] + "\n" + IMPORT + text[end:]


def patch_screen():
    p = SRC / "shared/ui/Screen.tsx"
    if not p.exists():
        problems.append("src/shared/ui/Screen.tsx not found")
        return
    text = p.read_text(encoding="utf-8")
    if "KeyboardAware" in text:
        skipped.append(rel(p))
        return
    if "export function Screen" not in text or "SafeAreaView" not in text:
        problems.append("src/shared/ui/Screen.tsx looks different from expected — send it to me")
        return
    write(p, SCREEN)


def patch_modals():
    """Wrap each bottom-sheet modal's backdrop in <KeyboardAware>."""
    for p in sorted(SRC.rglob("*.tsx")):
        if p.name.endswith(".bak-keyboard") or "keyboard.tsx" == p.name:
            continue
        text = p.read_text(encoding="utf-8")
        if "<Modal" not in text or 'justifyContent: "flex-end"' not in text:
            continue
        lines = text.split("\n")
        out, i, wrapped = [], 0, 0
        while i < len(lines):
            line = lines[i]
            out.append(line)
            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            if (re.search(r"<Modal\b[^<]*>\s*$", line) and 'justifyContent: "flex-end"' in nxt
                    and "<KeyboardAware" not in nxt):
                indent = re.match(r"\s*", nxt).group(0)
                out.append(f"{indent}<KeyboardAware>")
                # copy until this modal's closing tag
                j = i + 1
                depth = 0
                while j < len(lines):
                    if "<Modal" in lines[j]:
                        depth += 1
                    if "</Modal>" in lines[j]:
                        if depth == 0:
                            break
                        depth -= 1
                    out.append("  " + lines[j] if lines[j].strip() else lines[j])
                    j += 1
                out.append(f"{indent}</KeyboardAware>")
                wrapped += 1
                i = j
                continue
            i += 1
        if wrapped:
            write(p, add_import("\n".join(out)))


def patch_kav():
    """KeyboardAvoidingViews that also acted on Android would now double the space."""
    pat = re.compile(r'behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}')
    for p in sorted(SRC.rglob("*.tsx")):
        text = p.read_text(encoding="utf-8")
        if pat.search(text):
            write(p, pat.sub('behavior={Platform.OS === "ios" ? "padding" : undefined}', text))


def patch_artisan_city():
    p = SRC / "app/(app)/artisan-register.tsx"
    if not p.exists():
        skipped.append("artisan-register.tsx (not found)")
        return
    text = p.read_text(encoding="utf-8")
    if "<CityField" in text:
        skipped.append(rel(p))
        return
    picker = re.search(r'<PickerField label=\{t\("artisans\.dashboard\.cityLabel"\)\}[^\n]*?/>', text)
    old_fn = re.search(r"  function pickCity\(name: string\) \{\n.*?\n  \}\n", text, flags=re.S)
    if not picker or not old_fn:
        problems.append(f"{rel(p)}: couldn't find the city picker — send the file to me")
        return
    text = text.replace(picker.group(0),
                        '<CityField label={t("artisans.dashboard.cityLabel")} value={form.city} onChange={pickCity} />', 1)
    text = text.replace(old_fn.group(0), '''  function pickCity(pick: CityPick) {
    // Any city worldwide; coordinates/state come along when the place is known.
    setForm((f) => ({
      ...f, city: pick.city,
      state: f.state || pick.state || "",
      latitude: pick.lat ?? f.latitude, longitude: pick.lng ?? f.longitude,
    }));
  }
''', 1)
    text = text.replace('address: "", city: "Abuja", state: ""', 'address: "", city: "", state: ""', 1)
    imp = 'import { CityField, type CityPick } from "@/features/artisans/ui/CityField";'
    anchor = 'import { PickerField } from "@/features/travel";'
    text = text.replace(anchor, anchor + "\n" + imp, 1) if anchor in text else imp + "\n" + text
    write(p, text)


def patch_city_message():
    loc = SRC / "shared/i18n/locales/en.json"
    if loc.exists():
        lt = loc.read_text(encoding="utf-8")
        if '"vCity": "Choose your city."' in lt:
            write(loc, lt.replace('"vCity": "Choose your city."', '"vCity": "Enter your city."', 1))


def main():
    if not (ROOT / "app.json").exists():
        print("Run this from the mobile root (the folder containing app.json).")
        sys.exit(1)
    if not (SRC / "shared/ui/keyboard.tsx").exists():
        print("src/shared/ui/keyboard.tsx is missing — unzip oam-mobile-keyboard-city.zip here first.")
        sys.exit(1)
    patch_screen()
    patch_modals()
    patch_kav()
    patch_artisan_city()
    patch_city_message()
    verb = "Would change" if CHECK else "Changed"
    print(f"{verb}: " + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for x in problems:
            print("  - " + x)
        sys.exit(2)


if __name__ == "__main__":
    main()
