#!/usr/bin/env python3
"""
Wire the Jobs & Recruitment screens into the OAM mobile app (Expo).

Run from the mobile project root (the folder with app.json):

    python3 apply_jobs_mobile.py            # apply
    python3 apply_jobs_mobile.py --check    # preview, writes nothing

Safe to run more than once. Each edited file is backed up once as
<file>.bak-jobs.

What it changes
  src/app/(app)/_layout.tsx             registers the 15 jobs screens (hidden from the tab bar)
  src/app/(app)/home.tsx                "Jobs" tile under Shop & services
  src/features/navigation/drawer.tsx    "Jobs & Careers" link in the side menu
  src/app/_layout.tsx                   tapping a jobs push notification opens the right screen
  src/shared/i18n/locales/en.json       English labels for the above
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
MARK = "oam-jobs"
changed, skipped, problems = [], [], []

SCREENS = ["jobs", "jobs-search", "job", "jobs-applications", "jobs-saved", "jobs-profile",
           "jobs-employer", "jobs-company", "jobs-post", "jobs-pipeline", "jobs-candidates",
           "jobs-candidate", "jobs-plans", "jobs-messages", "jobs-chat"]


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else None


def write(rel, text):
    changed.append(rel)
    if CHECK:
        return
    p = ROOT / rel
    bak = p.with_name(p.name + ".bak-jobs")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")


def add_lucide(text, name):
    m = re.search(r'import \{([^}]*)\}\s*from "lucide-react-native";', text)
    if not m:
        return text, False
    if re.search(rf"\b{name}\b", m.group(1)):
        return text, True
    names = m.group(1).rstrip().rstrip(",")
    new = m.group(0).replace(m.group(1), f"{names}, {name}\n" if "\n" in m.group(1) else f"{names}, {name} ")
    return text.replace(m.group(0), new, 1), True


def patch_tabs():
    rel = "src/app/(app)/_layout.tsx"
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: not found")
        return
    if 'name="jobs-search"' in text:
        skipped.append(rel)
        return
    m = re.search(r"^([ \t]*)</Tabs>", text, flags=re.M)
    if not m:
        problems.append(f"{rel}: </Tabs> not found — register the jobs screens yourself")
        return
    ind = m.group(1) + "  "
    lines = f"{ind}{{/* {MARK}: Jobs & Recruitment screens */}}\n" + "".join(
        f'{ind}<Tabs.Screen name="{s}" options={{{{ href: null, tabBarStyle: {{ display: "none" }} }}}} />\n'
        for s in SCREENS)
    text = text[:m.start()] + lines + text[m.start():]
    write(rel, text)


def patch_home():
    rel = "src/app/(app)/home.tsx"
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: not found")
        return
    if 'id: "jobs"' in text:
        skipped.append(rel)
        return
    text, ok = add_lucide(text, "BriefcaseBusiness")
    tile = re.search(r'^([ \t]*)\{ id: "marketplace",[^\n]*\n', text, flags=re.M)
    route = re.search(r'^([ \t]*)if \(id === "marketplace"\) return router\.push\("/marketplace"\);\n', text, flags=re.M)
    if not (ok and tile and route):
        problems.append(f"{rel}: marketplace tile not found — add a Jobs tile routing to /jobs yourself")
        return
    text = (text[:tile.end()]
            + f'{tile.group(1)}{{ id: "jobs", lkey: "jobs", label: "Jobs", Icon: BriefcaseBusiness, tint: "green" }},\n'
            + text[tile.end():])
    route = re.search(r'^([ \t]*)if \(id === "marketplace"\) return router\.push\("/marketplace"\);\n', text, flags=re.M)
    text = (text[:route.start()]
            + f'{route.group(1)}if (id === "jobs") return router.push("/jobs" as never);\n'
            + text[route.start():])
    write(rel, text)


def patch_drawer():
    rel = "src/features/navigation/drawer.tsx"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if '"/jobs"' in text:
        skipped.append(rel)
        return
    text, ok = add_lucide(text, "BriefcaseBusiness")
    link = re.search(r'^([ \t]*)\{ key: "marketplace",[^\n]*\n', text, flags=re.M)
    if not (ok and link):
        problems.append(f"{rel}: marketplace link not found — side menu not updated (optional)")
        return
    text = (text[:link.end()]
            + f'{link.group(1)}{{ key: "jobs", label: t("drawer.jobs", "Jobs & Careers"), Icon: BriefcaseBusiness, onPress: () => go("/jobs") }},\n'
            + text[link.end():])
    write(rel, text)


def patch_root_layout():
    rel = "src/app/_layout.tsx"
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: not found")
        return
    if "useJobsPushRouting" in text:
        skipped.append(rel)
        return
    imp = 'import { syncPushToken } from "@/features/notifications";'
    hook = re.search(r'^([ \t]*)useEffect\(\(\) => \{\n[ \t]*if \(status === "authenticated"\) syncPushToken\(\);\n[ \t]*\}, \[status\]\);\n',
                     text, flags=re.M)
    if imp not in text or not hook:
        problems.append(f"{rel}: push setup not found — add useJobsPushRouting(status === \"authenticated\") "
                        "to the root layout yourself so tapping a jobs notification opens the right screen")
        return
    text = text.replace(imp, imp + f'\nimport {{ useJobsPushRouting }} from "@/features/jobs"; // {MARK}', 1)
    hook = re.search(r'^([ \t]*)useEffect\(\(\) => \{\n[ \t]*if \(status === "authenticated"\) syncPushToken\(\);\n[ \t]*\}, \[status\]\);\n',
                     text, flags=re.M)
    ind = hook.group(1)
    text = (text[:hook.end()]
            + f"\n{ind}// {MARK}: tapping a jobs notification opens the matching screen.\n"
            + f'{ind}useJobsPushRouting(status === "authenticated");\n'
            + text[hook.end():])
    write(rel, text)


EN = {
    ("dashboard", "services", "jobs"): "Jobs",
    ("drawer", "jobs"): "Jobs & Careers",
}


def patch_en():
    rel = "src/shared/i18n/locales/en.json"
    raw = read(rel)
    if raw is None:
        skipped.append(rel + " (not found)")
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


def check_deps():
    pkg = json.loads(read("package.json") or "{}")
    if "expo-document-picker" not in {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}:
        problems.append("expo-document-picker is not installed — run:  npx expo install expo-document-picker  "
                        "(needed to upload CVs; then make a new build, see MOBILE-INSTALL.md)")


def main():
    if not (ROOT / "app.json").exists():
        print("Run this from the mobile project root (the folder with app.json).")
        sys.exit(1)
    if not (ROOT / "src" / "features" / "jobs" / "api.ts").exists():
        print("src/features/jobs is missing — unzip oam-jobs-mobile.zip here first.")
        sys.exit(1)
    for fn in (patch_tabs, patch_home, patch_drawer, patch_root_layout, patch_en, check_deps):
        fn()
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done / skipped: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: npx expo start   (open the app → Home → Jobs)")


if __name__ == "__main__":
    main()
