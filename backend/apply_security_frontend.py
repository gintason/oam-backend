#!/usr/bin/env python3
"""
Stop the "GET /billing/revenue/ 403" console error.

The header used to *probe* the admin-only revenue endpoint to decide whether
to show the Earnings link, so every non-admin page view logged a 403. The API
now returns `is_staff` on the user (backend security patch); the header uses
that and only admins ever call the endpoint.

Run from the frontend folder (the one with package.json):

    python3 apply_security_frontend.py --check
    python3 apply_security_frontend.py          # backs up as *.bak-security
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
REL = "src/components/AppHeader.tsx"

OLD = '''  // Only admins can read revenue — if it succeeds, show the Earnings link.
  const isAdmin = useQuery({
    queryKey: ["revenue", scope, "probe"],
    queryFn: revenueApi.get,
    retry: false,
    staleTime: 10 * 60_000,
  }).isSuccess;'''

NEW = '''  // Admin links come from the user's own flags (/auth/me/ returns is_staff),
  // so non-admins never call the admin-only revenue endpoint (no 403 noise).
  const staff = user as { is_staff?: boolean; is_superuser?: boolean } | null;
  const isAdmin = Boolean(staff?.is_staff || staff?.is_superuser);'''


def main() -> None:
    if not (ROOT / "package.json").exists():
        sys.exit("Run this from the frontend folder (the one with package.json).")
    p = ROOT / REL
    if not p.exists():
        sys.exit(f"{REL} not found")
    s = p.read_text(encoding="utf-8")
    if NEW in s:
        print("Already done: " + REL)
        return
    if OLD not in s:
        print(f"NEEDS ATTENTION: {REL} — the revenue probe isn't in the expected shape.\n"
              "Replace the `isAdmin = useQuery({... revenueApi.get ...}).isSuccess` block with:\n\n" + NEW)
        sys.exit(2)
    s = s.replace(OLD, NEW, 1)
    # revenueApi may now be unused in this file; drop it from its import if so.
    if s.count("revenueApi") == 1:
        import re
        s = re.sub(r'^import \{ revenueApi \} from "[^"]+";\n', "", s, count=1, flags=re.M)
        s = s.replace("revenueApi, ", "").replace(", revenueApi", "")
    if CHECK:
        print("Would change: " + REL)
        return
    bak = p.with_name(p.name + ".bak-security")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(s, encoding="utf-8")
    print("Changed: " + REL + "\n\nNext: npm run build   (then push; Render rebuilds oam-web)")


if __name__ == "__main__":
    main()
