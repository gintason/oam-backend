"""
Add the public featured-artisans routes.

RUN FROM THE BACKEND ROOT:
    python3 wire_featured.py
"""
import ast, pathlib, re, sys

p = pathlib.Path("apps/homeservices/urls.py")
if not p.exists():
    sys.exit("apps/homeservices/urls.py not found — run from the backend root.")

original = s = p.read_text()
if "FeaturedArtisansView" in s:
    sys.exit("Already wired. Nothing to do.")

m = re.search(r'^urlpatterns\s*=', s, re.M)
s = (s[:m.start()]
     + "from .featured import FeaturedArtisansView, ServiceCategoriesPublicView\n\n"
     + s[m.start():])

# Literal paths must sit above "artisans/<uuid:artisan_id>/", or the converter
# swallows the word and you get a 404 that looks like a missing view.
detail = re.search(r'^([ \t]*)path\(\s*"artisans/<uuid:artisan_id>/"', s, re.M)
if not detail:
    sys.exit("Couldn't find the artisan detail route to anchor to.")
ind = detail.group(1)
routes = (
    f'{ind}path("featured/", FeaturedArtisansView.as_view(), name="hs-featured"),\n'
    f'{ind}path("categories/public/", ServiceCategoriesPublicView.as_view(), name="hs-categories-public"),\n'
)
s = s[:detail.start()] + routes + s[detail.start():]

p.write_text(s)
try:
    ast.parse(s)
except SyntaxError as exc:
    p.write_text(original)
    sys.exit(f"Edit would have broken urls.py ({exc}) — rolled back.")

print("patched apps/homeservices/urls.py\n")
for i, ln in enumerate(s.splitlines(), 1):
    if "path(" in ln:
        print(f"  {i:3d} {ln.strip()}")
print("\nNo migration needed. Restart the server.")
