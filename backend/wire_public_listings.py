"""
Add the public marketplace routes.

RUN FROM THE BACKEND ROOT:
    python3 wire_public_listings.py
"""
import ast, pathlib, re, sys

p = pathlib.Path("apps/marketplace/urls.py")
if not p.exists():
    sys.exit("apps/marketplace/urls.py not found — run from the backend root.")

original = s = p.read_text()
if "PublicListingsView" in s:
    sys.exit("Already wired.")

m = re.search(r'^urlpatterns\s*=', s, re.M)
s = (s[:m.start()]
     + "from .public_listings import PublicCategoriesView, PublicListingsView\n\n"
     + s[m.start():])

# Literal paths before any <uuid:...> converter route.
anchor = re.search(r'^([ \t]*)path\(\s*"listings/', s, re.M)
ind = anchor.group(1) if anchor else "    "
routes = (
    f'{ind}path("public/listings/", PublicListingsView.as_view(), name="mkt-public-listings"),\n'
    f'{ind}path("public/categories/", PublicCategoriesView.as_view(), name="mkt-public-categories"),\n'
)
at = anchor.start() if anchor else s.index("[", m.start()) + 1
s = s[:at] + routes + s[at:]

p.write_text(s)
try:
    ast.parse(s)
except SyntaxError as exc:
    p.write_text(original)
    sys.exit(f"Edit would have broken urls.py ({exc}) — rolled back.")

print("patched apps/marketplace/urls.py\n")
for i, ln in enumerate(s.splitlines(), 1):
    if "path(" in ln:
        print(f"  {i:3d} {ln.strip()}")
print("\nNo migration needed. Restart the server.")
