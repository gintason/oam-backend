#!/usr/bin/env python3
"""
Put the Google client IDs into .env (local) and every build profile in eas.json
(EAS builds), so the app requests ID tokens for the same Web client ID the
backend accepts (GOOGLE_CLIENT_IDS) and the website uses (VITE_GOOGLE_CLIENT_ID).

All IDs must come from the "OAM Platform" Google Cloud project (74521252008).

Run from the mobile project root (the folder with app.json):

    python3 set_google_ids.py                 # uses OAM's web + iOS client IDs
    python3 set_google_ids.py IOS_CLIENT_ID   # only if you create a new iOS client

Safe to run again with new values; it replaces the old ones.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SUFFIX = ".apps.googleusercontent.com"
PROJECT = "74521252008"
WEB_CLIENT_ID = "74521252008-u08inid1vo4tu9s4blkk7j119g8k851t.apps.googleusercontent.com"
IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com"


def check(value: str, what: str) -> str:
    value = value.strip()
    if not value.endswith(SUFFIX):
        sys.exit(f"{what} should look like {PROJECT}-abc{SUFFIX}  (got: {value})")
    if not value.startswith(PROJECT + "-"):
        sys.exit(f"{what} is from another Google project. Use the one from project {PROJECT}.")
    return value


def set_env(values: dict[str, str]) -> None:
    path = ROOT / ".env"
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    for key, val in values.items():
        line = f"{key}={val}"
        if re.search(rf"^{key}=.*$", text, flags=re.M):
            text = re.sub(rf"^{key}=.*$", line, text, flags=re.M)
        else:
            text = (text.rstrip("\n") + "\n" if text else "") + line + "\n"
    path.write_text(text, encoding="utf-8")
    print(f"  .env        {', '.join(values)}")


def set_eas(values: dict[str, str]) -> None:
    path = ROOT / "eas.json"
    if not path.exists():
        print("  eas.json    not found (skipped)")
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    profiles = data.get("build", {})
    for prof in profiles.values():
        prof.setdefault("env", {}).update(values)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"  eas.json    {', '.join(values)} in: {', '.join(profiles) or 'no profiles'}")


def main() -> None:
    if not (ROOT / "app.json").exists():
        sys.exit("Run this from the mobile project root (the folder with app.json).")
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] in ("-h", "--help")):
        sys.exit(__doc__)
    values = {"EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": WEB_CLIENT_ID, "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": IOS_CLIENT_ID}
    if len(sys.argv) == 2:
        ios = check(sys.argv[1], "iOS client ID")
        if ios == WEB_CLIENT_ID:
            sys.exit("That's the Web client ID. Pass the iOS client ID (Credentials → OAuth 2.0 Client IDs → type iOS).")
        values["EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"] = ios
    print("Updated:")
    set_env(values)
    set_eas(values)
    print(f"\nBackend GOOGLE_CLIENT_IDS on Render must be: {WEB_CLIENT_ID}")


if __name__ == "__main__":
    main()
