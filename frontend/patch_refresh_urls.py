"""
Wire the order-refresh endpoints into apps/billing/urls.py.

WHY A SCRIPT
  Order matters here. Django matches urlpatterns top to bottom and stops at the
  first hit, so a literal path like "orders/refresh/" MUST sit above
  "orders/<str:reference>/" — otherwise <str:reference> swallows the word
  "refresh" and you get 405 Method Not Allowed (which is exactly what happened:
  the detail view matched, and it only accepts GET).

  This inserts both routes in the correct position and adds the import.

RUN FROM THE BACKEND ROOT:
    python3 patch_refresh_urls.py
"""
import pathlib
import re
import sys

p = pathlib.Path("apps/billing/urls.py")
if not p.exists():
    sys.exit("apps/billing/urls.py not found — run this from the backend root.")

if not pathlib.Path("apps/billing/refresh.py").exists():
    sys.exit("apps/billing/refresh.py not found — unzip oam_auto_refresh_backend.zip "
             "into apps/billing first.")

s = p.read_text()

if "OrdersRefreshAllView" in s:
    print("Already wired. Nothing to do.")
    sys.exit(0)

# 1. import
m = re.search(r'^from \.[\w.]+ import [^\n]+$', s, re.M)
imp = "from .refresh import OrderRefreshView, OrdersRefreshAllView\n"
if m:
    s = s[:m.end() + 1] + imp + s[m.end() + 1:]
else:
    lines = s.splitlines(keepends=True)
    last = max((i for i, ln in enumerate(lines[:40])
                if ln.startswith(("import ", "from "))), default=0)
    lines.insert(last + 1, imp)
    s = "".join(lines)

# 2. routes — inserted directly BEFORE the detail route
detail = re.search(r'^\s*path\(\s*"orders/<str:reference>/"[^\n]*\n', s, re.M)
if not detail:
    sys.exit('Could not find the path("orders/<str:reference>/", ...) line. '
             "Add the two routes by hand — see the README.")

indent = re.match(r'\s*', detail.group(0)).group(0)
routes = (
    f'{indent}path("orders/refresh/", OrdersRefreshAllView.as_view(), name="orders-refresh-all"),\n'
    f'{indent}path("orders/<str:reference>/refresh/", OrderRefreshView.as_view(), name="order-refresh"),\n'
)
s = s[:detail.start()] + routes + s[detail.start():]

p.write_text(s)
print("✓ patched apps/billing/urls.py\n")
for i, ln in enumerate(s.splitlines(), 1):
    if "orders" in ln and "path(" in ln:
        print(f"  {i:3d} {ln.strip()}")
print("\nNow restart the server:  python3 manage.py runserver 8080")
