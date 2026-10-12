#!/usr/bin/env python3
"""
O.A.M mobile — ready for Google Play (.aab) and App Store / TestFlight (.ipa).

Unzip oam-store-release-mobile.zip in the mobile root (with app.json), then:
    python3 apply_store_release.py
    npm install
Then follow STORE-RELEASE.md.

  • Sign in with Apple on iOS (sign-in, sign-up, Welcome back) — Apple guideline 4.8
  • Profile → Delete account (+ confirmation screen) — Apple 5.1.1(v), Google Play
  • app.json: Android photo/video storage permissions blocked (Play photo-picker policy),
    new adaptive icon + notification icon, iOS privacy manifest, iPhone-only,
    expo-notifications + expo-apple-authentication plugins
  • app.config.js: uses google-services.json automatically when you add it (Android push)
  • eas.json: production Android = .aab; submit profiles internal / closed / production
  • translations for the new screens in all 20 languages
Backups: *.bak-storerel
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
if not (ROOT / "app.json").exists() or not PAY.exists():
    print("Run this from the mobile root (the folder with app.json) after unzipping the update there.")
    sys.exit(1)

apply_edits(PAY, "storerel")
copy_files(PAY)
merge_locales(PAY, "src/shared/i18n/locales")


def edit_json(rel, fn):
    p = ROOT / rel
    raw = p.read_text(encoding="utf-8")
    data = json.loads(raw)
    bak = p.with_name(p.name + ".bak-storerel")
    if not bak.exists():
        shutil.copy2(p, bak)
    fn(data)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated", rel)


def app_json(cfg):
    e = cfg["expo"]
    ios = e.setdefault("ios", {})
    ios["supportsTablet"] = False
    ios["privacyManifests"] = {"NSPrivacyAccessedAPITypes": [
        {"NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults", "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]},
        {"NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPITypeReasons": ["C617.1"]},
        {"NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime", "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]},
        {"NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace", "NSPrivacyAccessedAPITypeReasons": ["E174.1"]},
    ]}
    a = e.setdefault("android", {})
    a.pop("edgeToEdgeEnabled", None)            # Android 16 makes edge-to-edge mandatory
    a["adaptiveIcon"] = {"backgroundColor": "#FFFFFF", "foregroundImage": "./assets/images/oam-adaptive-foreground.png"}
    a["permissions"] = [x for x in a.get("permissions", []) if x not in ("READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO")]
    blocked = a.setdefault("blockedPermissions", [])
    for perm in ["READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO", "READ_MEDIA_VISUAL_USER_SELECTED",
                 "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW"]:
        if f"android.permission.{perm}" not in blocked:
            blocked.append(f"android.permission.{perm}")
    plugins = e.setdefault("plugins", [])
    names = [x[0] if isinstance(x, list) else x for x in plugins]
    if "expo-notifications" not in names:
        plugins.append(["expo-notifications", {"icon": "./assets/images/oam-notification-icon.png", "color": "#0B7327"}])
    if "expo-apple-authentication" not in names:
        plugins.append("expo-apple-authentication")


def eas_json(eas):
    prod = eas.setdefault("build", {}).setdefault("production", {})
    prod.setdefault("android", {})["buildType"] = "app-bundle"
    sub = eas.setdefault("submit", {})
    sub["internal"] = {"android": {"track": "internal", "releaseStatus": "completed"}}
    sub["closed"] = {"android": {"track": "alpha", "releaseStatus": "completed"}}
    prod_sub = sub.setdefault("production", {})
    prod_sub["android"] = {**prod_sub.get("android", {}), "track": "production", "releaseStatus": "draft"}
    prod_sub.setdefault("ios", {})


def package_json(pkg):
    pkg.setdefault("dependencies", {}).setdefault("expo-apple-authentication", "~57.0.2")


edit_json("app.json", app_json)
edit_json("eas.json", eas_json)
edit_json("package.json", package_json)
print("\nDone. Now run:  npm install   — then follow STORE-RELEASE.md")
