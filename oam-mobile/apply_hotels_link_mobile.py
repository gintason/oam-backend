#!/usr/bin/env python3
"""
Mobile: Hotels opens Klook through our backend, like the website.

The app opened the old klook.tpk.ro short link directly, which is blocked or ends
on "null is unreachable" outside Nigeria. It now goes through
<api>/affiliates/go/klook/, which sends every visitor to a working Klook link.

Unzip in the mobile project root (with app.json), then:
    python3 apply_hotels_link_mobile.py
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"src/features/travel/reference.ts": [["  ],\\n};\\n\\nexport const KLOOK_LINK = \\"https://klook.tpk.ro/5WurYtDG\\";\\n\\nexport function today() {\\n  return new Date().toISOString().slice(0, 10);\\n", "  ],\\n};\\n\\nimport { env } from \\"@/shared/config/env\\";\\n\\n// Hotels go through our backend (/affiliates/go/klook/), like the website: it\\n// records the click and sends the visitor to a clean Klook link that works in\\n// every country. The old klook.tpk.ro short link is blocked or ends on\\n// \\"null is unreachable\\" outside Nigeria.\\nexport const KLOOK_LINK = `${env.apiUrl.replace(/\\\\/$/, \\"\\")}/affiliates/go/klook/`;\\n\\nexport function today() {\\n  return new Date().toISOString().slice(0, 10);\\n"]]}, "files": {}, "locales": {}}')
TAG = 'klook'
if not (ROOT / 'app.json').exists():
    print("Run this from the mobile project root (the folder with app.json)."); sys.exit(1)

plan, skipped = {}, []
for rel, pairs in DATA["edits"].items():
    p = ROOT / rel
    if not p.exists():
        print("Missing:", rel, "- nothing changed."); sys.exit(1)
    s = p.read_text(encoding="utf-8")
    if all(new in s for _, new in pairs):
        skipped.append(rel); continue
    for old, new in pairs:
        if s.count(old) != 1:
            print(rel, "doesn't look as expected - nothing changed. Send me that file and I'll adapt the update."); sys.exit(1)
        s = s.replace(old, new)
    plan[p] = s
for p, s in plan.items():
    shutil.copy2(p, p.with_name(p.name + ".bak-" + TAG))
    p.write_text(s, encoding="utf-8"); print("patched:", p.relative_to(ROOT))
for rel in skipped: print("already up to date:", rel)
for rel, text in DATA.get("files", {}).items():
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and p.read_text(encoding="utf-8") == text:
        print("up to date:", rel); continue
    p.write_text(text, encoding="utf-8"); print("wrote:", rel)
for base, (dirrel, langs) in DATA.get("locales", {}).items():
    d = ROOT / dirrel; n = 0
    for lang, kv in langs.items():
        p = d / (lang + ".json")
        if not p.exists(): continue
        raw = p.read_text(encoding="utf-8"); obj = json.loads(raw); node = obj
        for part in base.split("."): node = node.setdefault(part, {})
        node.update(kv)
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8"); n += 1
    print("translations:", base, "in", n, "languages")
print("Done.")
