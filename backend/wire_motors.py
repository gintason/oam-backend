"""
Wire the O.A.M Motors inventory into the marketplace app.

Also exposes vehicle facts on the PUBLIC listing detail, so a buyer browsing
normally sees the year, mileage and transmission rather than a bare description.

RUN FROM THE BACKEND ROOT:
    python3 wire_motors.py
"""
import ast, pathlib, re, sys

ROOT = pathlib.Path(".")


def safe(path, new, original, label):
    path.write_text(new)
    try:
        ast.parse(new)
        print(f"  {label}: done")
        return True
    except SyntaxError as exc:
        path.write_text(original)
        print(f"  !! {label} would have broken ({exc}) — rolled back")
        return False


# ------------------------------------------------------------------ models --
p = ROOT / "apps" / "marketplace" / "models.py"
s = p.read_text()
if "from .motors import" in s:
    print("  models.py: already registered")
else:
    # At the END: motors.py imports Listing from this module, so the models
    # above must exist before it loads.
    new = s.rstrip() + (
        "\n\n# Registered last: motors.py imports Listing/Category from this module,\n"
        "# so those models must be defined before it is loaded.\n"
        "from .motors import VehicleDetail  # noqa: E402,F401\n"
    )
    safe(p, new, s, "models.py")

# -------------------------------------------------------------------- urls --
p = ROOT / "apps" / "marketplace" / "urls.py"
s = p.read_text()
if "MotorsInventoryView" in s:
    print("  urls.py: already registered")
else:
    m = re.search(r'^urlpatterns\s*=', s, re.M)
    new = (s[:m.start()]
           + "from .motors import MotorsDetailView, MotorsInventoryView\n\n"
           + s[m.start():])

    # Literal path BEFORE listings/<uuid:listing_id>/, or the converter would
    # swallow it — the same trap that cost us an evening on orders/refresh/.
    anchor = re.search(r'^([ \t]*)path\(\s*"listings/', new, re.M)
    ind = anchor.group(1) if anchor else "    "
    routes = (
        f'{ind}path("motors/", MotorsInventoryView.as_view(), name="mkt-motors"),\n'
        f'{ind}path("motors/<uuid:listing_id>/", MotorsDetailView.as_view(), name="mkt-motors-detail"),\n'
    )
    at = anchor.start() if anchor else new.index("[", m.start()) + 1
    new = new[:at] + routes + new[at:]
    safe(p, new, s, "urls.py")

# ------------------------------------- vehicle facts on the public listing --
p = ROOT / "apps" / "marketplace" / "serializers.py"
s = p.read_text()
if "vehicle" in s and "VehicleSerializer" in s:
    print("  serializers.py: already exposes vehicle")
else:
    m = re.search(r'class ListingDetailSerializer\b.*?(?=\nclass |\Z)', s, re.S)
    if not m:
        print("  !! ListingDetailSerializer not found — add `vehicle` by hand")
    else:
        block = m.group(0)
        fields = re.search(r'fields\s*=\s*\(([^)]*)\)', block, re.S)
        names = [n.strip() for n in fields.group(1).split(",") if n.strip()]
        names.append('"vehicle"')
        new_block = (block[:fields.start()]
                     + "fields = (" + ", ".join(names) + ")"
                     + block[fields.end():])

        # declare the nested serializer on the class
        decl = re.search(r'(class ListingDetailSerializer[^\n]*\n)', new_block)
        new_block = (new_block[:decl.end()]
                     + '    # Present only on O.A.M Motors listings; null everywhere else.\n'
                     + '    vehicle = VehicleSerializer(read_only=True)\n'
                     + new_block[decl.end():])

        new = s.replace(block, new_block)
        if "from .motors import VehicleSerializer" not in new:
            mm = re.search(r'^from \.models import[^\n]*\n', new, re.M)
            at = mm.end() if mm else 0
            new = new[:at] + "from .motors import VehicleSerializer\n" + new[at:]
        safe(p, new, s, "serializers.py")

print("\nNow run:")
print("  python3 manage.py makemigrations marketplace")
print("  python3 manage.py migrate")
