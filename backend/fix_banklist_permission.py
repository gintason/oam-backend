"""
Fix: the bank list is admin-only, so ordinary users can't add a payout account.

BankListView (GET /payouts/banks-list/) is declared IsAdminUser. Customers need
that list to choose their bank when saving a withdrawal account, so this changes
it to a normal authenticated+verified user.

Only that ONE view changes. Withdrawals, resolve-account and admin views keep
their existing permissions.

Run from the backend root:   python3 fix_banklist_permission.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(".").resolve()
SKIP = {"venv", ".venv", "node_modules", ".git", "__pycache__", "staticfiles"}

target = None
for p in ROOT.rglob("*.py"):
    if any(part in SKIP for part in p.parts):
        continue
    try:
        s = p.read_text()
    except Exception:
        continue
    if "class BankListView" in s:
        target = p
        break

if target is None:
    sys.exit("Could not find BankListView. Is apps/payouts/views.py present?")

s = target.read_text()

m = re.search(
    r'(class BankListView\b.*?permission_classes\s*=\s*)\[([^\]]*)\]',
    s, re.S,
)
if not m:
    sys.exit(f"Found {target} but not the permission_classes line — patch by hand.")

current = m.group(2).strip()
if "IsAdminUser" not in current:
    print(f"Already changed (currently: [{current}]). Nothing to do.")
    sys.exit(0)

s = s[: m.start(2)] + "IsAuthenticated, IsVerified" + s[m.end(2):]

# make sure both permissions are imported
if "IsAuthenticated" not in s.split("class ")[0]:
    s = re.sub(
        r'(from rest_framework\.permissions import )([^\n]+)',
        lambda mm: mm.group(1) + mm.group(2) + (", IsAuthenticated" if "IsAuthenticated" not in mm.group(2) else ""),
        s, count=1,
    )
if "IsVerified" not in s:
    # add the project's IsVerified import next to other apps.common imports
    if "from apps.common.permissions import" in s:
        s = re.sub(
            r'(from apps\.common\.permissions import )([^\n]+)',
            lambda mm: mm.group(1) + mm.group(2) + (", IsVerified" if "IsVerified" not in mm.group(2) else ""),
            s, count=1,
        )
    else:
        lines = s.splitlines(keepends=True)
        last_import = max(
            (i for i, ln in enumerate(lines[:60]) if ln.startswith(("import ", "from "))),
            default=0,
        )
        lines.insert(last_import + 1, "from apps.common.permissions import IsVerified\n")
        s = "".join(lines)

target.write_text(s)
print(f"✓ patched {target}")
print("  BankListView is now available to any verified signed-in user.")
print("\nNext: python3 manage.py check   then restart the server.")
