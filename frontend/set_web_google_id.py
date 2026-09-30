#!/usr/bin/env python3
"""
Point the website's Google sign-in at the OAM Platform project (74521252008),
the same Web client ID the backend (GOOGLE_CLIENT_IDS) and the mobile app use.

Run from the frontend folder (the one with package.json):

    python3 set_web_google_id.py            # apply
    python3 set_web_google_id.py --check    # preview, writes nothing

Safe to run more than once.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
WEB_CLIENT_ID = "74521252008-u08inid1vo4tu9s4blkk7j119g8k851t.apps.googleusercontent.com"
ID_RE = r"\d+-[a-z0-9]+\.apps\.googleusercontent\.com"


def update(rel: str, fn) -> None:
    path = ROOT / rel
    if not path.exists():
        print(f"  {rel:<24} not found (skipped)")
        return
    old = path.read_text(encoding="utf-8")
    new = fn(old)
    if new == old:
        print(f"  {rel:<24} already up to date")
        return
    if not CHECK:
        path.write_text(new, encoding="utf-8")
    print(f"  {rel:<24} {'would update' if CHECK else 'updated'}")


def env(text: str) -> str:
    line = f"VITE_GOOGLE_CLIENT_ID={WEB_CLIENT_ID}"
    if re.search(r"^VITE_GOOGLE_CLIENT_ID=.*$", text, flags=re.M):
        return re.sub(r"^VITE_GOOGLE_CLIENT_ID=.*$", line, text, flags=re.M)
    return (text.rstrip("\n") + "\n" if text else "") + line + "\n"


def social_sdk(text: str) -> str:
    # The fallback used when VITE_GOOGLE_CLIENT_ID is missing at build time.
    return re.sub(rf'(VITE_GOOGLE_CLIENT_ID[^\n]*\n\s*\|\|\s*")({ID_RE})(")',
                  rf"\g<1>{WEB_CLIENT_ID}\g<3>", text)


def main() -> None:
    if not (ROOT / "package.json").exists():
        sys.exit("Run this from the frontend folder (the one with package.json).")
    print(("Preview:" if CHECK else "Google client ID →") + f" {WEB_CLIENT_ID}")
    update(".env", env)
    update("src/auth/socialSdk.ts", social_sdk)
    print("\nAlso set VITE_GOOGLE_CLIENT_ID to the same value on Render → oam-web → Environment"
          " (a value there overrides .env), then redeploy oam-web.")


if __name__ == "__main__":
    main()
