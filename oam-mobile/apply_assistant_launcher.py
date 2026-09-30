#!/usr/bin/env python3
"""
Bring back the minimise / restore behaviour of the O.A.M Assistant button on
mobile, mirroring the web (× badge tucks it into a slim edge tab; tap to restore).

Run from the mobile project root (the folder with app.json), after unzipping
oam-assistant-launcher-mobile.zip there:

    python3 apply_assistant_launcher.py --check    # preview
    python3 apply_assistant_launcher.py            # apply (backs up as *.bak-launcher)

Safe to run more than once.
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
changed, skipped, problems = [], [], []

HOME = "src/app/(app)/home.tsx"
INDEX = "src/features/assistant/index.ts"
COMPONENT = "src/features/assistant/ui/AssistantLauncher.tsx"
IMPORT = 'import { AssistantLauncher } from "@/features/assistant";'
EXPORT = 'export { AssistantLauncher } from "./ui/AssistantLauncher";'

# The old plain launcher on Home: <Pressable onPress={() => router.push("/assistant")} …>…</Pressable>
OLD_BUTTON = re.compile(
    r'^([ \t]*)<Pressable\s+onPress=\{\(\) => router\.push\("/assistant"\)\}.*?</Pressable>\n',
    re.S | re.M,
)


def write(rel: str, text: str) -> None:
    changed.append(rel)
    if CHECK:
        return
    p = ROOT / rel
    bak = p.with_name(p.name + ".bak-launcher")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")


def patch_index() -> None:
    p = ROOT / INDEX
    if not p.exists():
        problems.append(f"{INDEX}: not found")
        return
    s = p.read_text(encoding="utf-8")
    if EXPORT in s:
        skipped.append(INDEX)
        return
    write(INDEX, s.rstrip("\n") + "\n" + EXPORT + "\n")


def patch_home() -> None:
    p = ROOT / HOME
    if not p.exists():
        problems.append(f"{HOME}: not found")
        return
    s = p.read_text(encoding="utf-8")
    if "<AssistantLauncher" in s:
        skipped.append(HOME)
        return
    m = OLD_BUTTON.search(s)
    if not m:
        problems.append(f"{HOME}: couldn't find the old assistant button — add <AssistantLauncher /> "
                        f"before </Screen> and {IMPORT} yourself")
        return
    s = s[:m.start()] + f"{m.group(1)}<AssistantLauncher />\n" + s[m.end():]

    # Import after the last top-level import line.
    imports = list(re.finditer(r'^import .*?;[ \t]*$', s, flags=re.M | re.S))
    last = imports[-1]
    s = s[:last.end()] + "\n" + IMPORT + s[last.end():]

    # MessageCircle was only used by the old button — drop it from the lucide import.
    if len(re.findall(r"\bMessageCircle\b", s)) == 1:
        s = re.sub(r"\bMessageCircle,\s*", "", s, count=1)
    write(HOME, s)


def main() -> None:
    if not (ROOT / "app.json").exists():
        sys.exit("Run this from the mobile project root (the folder with app.json).")
    if not (ROOT / COMPONENT).exists():
        sys.exit("Unzip oam-assistant-launcher-mobile.zip here first.")
    patch_index()
    patch_home()
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for x in problems:
            print("  - " + x)
        sys.exit(2)
    print("\nNext: npx expo start -c   (Home → tap × on the chat button to tuck it away)")


if __name__ == "__main__":
    main()
