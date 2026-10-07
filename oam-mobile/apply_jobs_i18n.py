#!/usr/bin/env python3
"""
Jobs / recruitment screens + the password-only “Welcome back” login — translated into every OAM language (mobile).

Unzip oam-jobs-i18n-mobile.zip in the mobile app root (the folder containing package.json), then:
    python3 apply_jobs_i18n.py

What it does:
  1. Checks every file it is about to replace still matches the version this
     update was built from. If any file differs, NOTHING is changed and the
     differing files are listed (send them to me). `--force` overwrites anyway.
  2. Replaces 25 source files (originals backed up as *.bak-i18njobs)
     and adds src/features/jobs/i18n.ts.
  3. Merges the jobs/recruitment translations (20 languages) into
     src/shared/i18n/locales/<lang>.json — only these keys are added/updated;
     everything else in your locale files is left untouched.

Safe to run twice: files already updated are skipped.
Ships with `eas update` — no new store build needed.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE
PAYLOAD = HERE / "i18n-jobs"
LOCALES = "src/shared/i18n/locales"
FORCE = "--force" in sys.argv


def digest(p):
    return hashlib.sha256(p.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


if not (ROOT / "package.json").exists() or not PAYLOAD.exists():
    print("Run this from the mobile app root after unzipping oam-jobs-i18n-mobile.zip there.")
    sys.exit(1)

manifest = json.loads((PAYLOAD / "manifest.json").read_text(encoding="utf-8"))
todo, already, mismatched, missing = [], [], [], []
for rel, info in manifest["replace"].items():
    p = ROOT / rel
    if not p.exists():
        missing.append(rel)
        continue
    h = digest(p)
    if h == info["new"]:
        already.append(rel)
    elif h == info["orig"] or FORCE:
        todo.append(rel)
    else:
        mismatched.append(rel)

if (missing or mismatched) and not FORCE:
    print("Nothing was changed. These files are not the version this update expects:")
    for r in missing:
        print("   missing :", r)
    for r in mismatched:
        print("   differs :", r)
    print("\nSend me those files (or re-run with --force to overwrite them; backups are kept).")
    sys.exit(1)

for rel in todo:
    dst = ROOT / rel
    if dst.exists():
        bak = dst.with_name(dst.name + ".bak-i18njobs")
        if not bak.exists():
            shutil.copy2(dst, bak)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PAYLOAD / "files" / rel, dst)
added = []
for rel in manifest["add"]:
    dst = ROOT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PAYLOAD / "files" / rel, dst)
    added.append(rel)

bundle = json.loads((PAYLOAD / "translations.json").read_text(encoding="utf-8"))
merged = []
for lang, flat in bundle.items():
    p = ROOT / LOCALES / f"{lang}.json"
    if not p.exists():
        print(f"   (no {LOCALES}/{lang}.json — skipped)")
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
    merged.append(lang)

print(f"Updated {len(todo)} files, {len(already)} already up to date, added {len(added)}.")
print(f"Translations merged into {len(merged)} locale files: {', '.join(merged)}")
if FORCE and mismatched:
    print("Overwrote (with --force):", ", ".join(mismatched))
print("Done.")
