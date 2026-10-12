#!/usr/bin/env python3
"""
Backend for the store release.

Unzip oam-store-release-backend.zip in the backend root (with manage.py), then:
    python3 apply_store_release.py
    pip install -r requirements.txt
    python manage.py test apps.accounts

  • POST/GET /api/v1/auth/delete-account/ — self-service account deletion (anonymises
    personal data, takes listings/profiles down, revokes sessions; keeps financial
    records; refuses while money or a delivery is still in progress)
  • Sign in with Apple accepted from the iOS app (APPLE_CLIENT_IDS defaults to
    com.oam.mobile, even if the variable is set but empty)
  • requirements.txt: + cryptography (needed to verify Apple's RS256 tokens)
Backups: *.bak-storerel. No migrations.
"""
# ---- shared installer core (inlined into each apply script) ----
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def apply_edits(pay, tag):
    edits = json.loads((pay / "edits.json").read_text(encoding="utf-8"))
    plan, already, problems = [], [], []
    for rel, reps in edits.items():
        p = ROOT / rel
        if not p.exists():
            problems.append(f"{rel}: not found"); continue
        t = p.read_text(encoding="utf-8").replace("\r\n", "\n")
        if all(new in t for _, new in reps):
            already.append(rel); continue
        if any(t.count(old) != 1 for old, _ in reps):
            problems.append(f"{rel}: couldn't find the expected code — send me this file"); continue
        for old, new in reps:
            t = t.replace(old, new, 1)
        plan.append((p, rel, t))
    if problems:
        print("Nothing was changed:")
        for m in problems:
            print("   " + m)
        sys.exit(1)
    for p, rel, t in plan:
        bak = p.with_name(p.name + f".bak-{tag}")
        if not bak.exists():
            shutil.copy2(p, bak)
        p.write_text(t, encoding="utf-8")
        print("Patched", rel)
    for rel in already:
        print("Already up to date:", rel)


def copy_files(pay):
    base = pay / "files"
    for f in sorted(base.rglob("*")):
        if f.is_file():
            dst = ROOT / f.relative_to(base)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, dst)
            print("Added", dst.relative_to(ROOT))


def merge_locales(pay, locales_rel):
    bundle = json.loads((pay / "translations.json").read_text(encoding="utf-8"))
    done = []
    for lang, flat in bundle.items():
        p = ROOT / locales_rel / f"{lang}.json"
        if not p.exists():
            continue
        raw = p.read_text(encoding="utf-8")
        data = json.loads(raw)
        for key, val in flat.items():
            node, parts = data, key.split(".")
            for part in parts[:-1]:
                if not isinstance(node.get(part), dict):
                    node[part] = {}
                node = node[part]
            node[parts[-1]] = val
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        done.append(lang)
    print(f"Translations merged into {len(done)} languages.")


PAY = ROOT / "payload"
if not (ROOT / "manage.py").exists() or not PAY.exists():
    print("Run this from the backend root (the folder with manage.py) after unzipping the update there.")
    sys.exit(1)
apply_edits(PAY, "storerel")
copy_files(PAY)
print("\nDone. Now:  pip install -r requirements.txt  &&  python manage.py test apps.accounts")
