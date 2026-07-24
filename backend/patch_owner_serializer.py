"""
Give artisans back their own contact details.

THE PROBLEM
  Stripping phone/whatsapp from ArtisanDetailSerializer correctly hid them from
  the public. But MyArtisanView returns that same serializer, so an artisan
  viewing their OWN profile no longer sees their number — and the dashboard
  form would load blank and overwrite the saved value with an empty string.

WHY NOT JUST USE ArtisanWriteSerializer
  It has the contact fields but lacks is_featured, is_verified and views_count,
  which the dashboard needs to show boost status. So this adds a dedicated
  owner serializer: everything in the detail view, plus the contacts.

  Three serializers, three audiences:
      ArtisanListSerializer   — search results, no contacts
      ArtisanDetailSerializer — public profile, no contacts
      ArtisanOwnerSerializer  — your own profile, WITH contacts

RUN FROM THE BACKEND ROOT:
    python3 patch_owner_serializer.py
"""
import ast
import pathlib
import re
import sys

# ---------------------------------------------------------------- serializer --
sp = pathlib.Path("apps/homeservices/serializers.py")
if not sp.exists():
    sys.exit("apps/homeservices/serializers.py not found — run from the backend root.")

s = sp.read_text()
original = s

if "ArtisanOwnerSerializer" in s:
    print("  serializer: already present")
else:
    m = re.search(r'class ArtisanDetailSerializer\b.*?(?=\nclass |\Z)', s, re.S)
    if not m:
        sys.exit("Could not find ArtisanDetailSerializer.")
    block = m.group(0)
    fields = re.search(r'fields\s*=\s*\(([^)]*)\)', block, re.S)
    names = [n.strip() for n in fields.group(1).split(",") if n.strip()]

    # insert contacts after business_name so the shape reads naturally
    try:
        at = names.index('"business_name"') + 1
    except ValueError:
        at = 1
    names[at:at] = ['"phone"', '"whatsapp"']

    owner = (
        '\n\nclass ArtisanOwnerSerializer(ArtisanDetailSerializer):\n'
        '    """\n'
        '    The artisan\'s own view of their profile.\n\n'
        '    Same as the public one plus phone/whatsapp — they must be able to see\n'
        '    and edit the numbers they gave us. Never use this for anyone else\'s\n'
        '    profile: contacts belong behind an accepted conversation.\n'
        '    """\n\n'
        '    class Meta(ArtisanDetailSerializer.Meta):\n'
        f'        fields = ({", ".join(names)})\n'
    )
    s = s[:m.end()] + owner + s[m.end():]
    sp.write_text(s)
    try:
        ast.parse(s)
        print("  serializer: added ArtisanOwnerSerializer")
    except SyntaxError as exc:
        sp.write_text(original)
        sys.exit(f"Edit broke serializers.py ({exc}) — rolled back.")

# --------------------------------------------------------------------- views --
vp = pathlib.Path("apps/homeservices/views.py")
v = vp.read_text()
v_original = v

if "ArtisanOwnerSerializer" not in v:
    v = v.replace("    ArtisanDetailSerializer,",
                  "    ArtisanDetailSerializer,\n    ArtisanOwnerSerializer,", 1)

# Swap ONLY the owner-facing responses. ArtisanDetailView (public) keeps the
# public serializer — that's the whole point.
changed = 0
lines = v.splitlines(keepends=True)
current = None
for i, line in enumerate(lines):
    m = re.match(r'class (\w+)', line)
    if m:
        current = m.group(1)
    if current in ("ArtisanRegisterView", "MyArtisanView") and "ArtisanDetailSerializer(" in line:
        lines[i] = line.replace("ArtisanDetailSerializer(", "ArtisanOwnerSerializer(")
        changed += 1
v = "".join(lines)

vp.write_text(v)
try:
    ast.parse(v)
except SyntaxError as exc:
    vp.write_text(v_original)
    sys.exit(f"Edit broke views.py ({exc}) — rolled back.")

print(f"  views: swapped {changed} owner response(s) to ArtisanOwnerSerializer")
print("\nWhich serializer each view now returns:")
current = None
for line in v.splitlines():
    m = re.match(r'class (\w+)', line)
    if m:
        current = m.group(1)
    for ser in re.findall(r'(Artisan\w*Serializer)\(', line):
        print(f"    {current:24s} -> {ser}")

print("\nNo migration needed. Restart the server, then verify:")
print('  python3 manage.py shell -c "from apps.homeservices.serializers import '
      'ArtisanOwnerSerializer, ArtisanDetailSerializer; '
      "print('owner :', ArtisanOwnerSerializer.Meta.fields); "
      "print('public:', ArtisanDetailSerializer.Meta.fields)\"")
