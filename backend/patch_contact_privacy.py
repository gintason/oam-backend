"""
Remove contact details from the PUBLIC detail endpoints.

THE HOLE THIS CLOSES
  ArtisanDetailSerializer returned  phone / whatsapp
  ListingDetailSerializer returned  contact_phone / contact_whatsapp

  Both endpoints are readable by any signed-in user, so the messaging contact
  gate was decorative: you could fetch /artisans/<id>/ and read the number
  without ever making an enquiry, and a script could walk every profile in
  minutes. Numbers harvested that way are what fuel the WhatsApp scams these
  marketplaces are known for — and every off-platform deal is one you have no
  record of.

  After this patch, contacts come from ONE place: an accepted conversation, via
  /api/v1/messaging/. The provider chooses when to share, and you have a record
  that the introduction happened.

WHAT ABOUT THE OWNER?
  Owners still see and edit their own numbers — those live on the WRITE
  serializers (ArtisanWriteSerializer, ListingWriteSerializer), which this
  script deliberately leaves alone. The script prints which views use which
  serializer so you can confirm nothing owner-facing broke.

RUN FROM THE BACKEND ROOT:
    python3 patch_contact_privacy.py
"""
import ast
import pathlib
import re
import sys

TARGETS = [
    ("apps/homeservices/serializers.py", "ArtisanDetailSerializer", ("phone", "whatsapp")),
    ("apps/marketplace/serializers.py", "ListingDetailSerializer",
     ("contact_phone", "contact_whatsapp")),
]

for path_str, class_name, drop in TARGETS:
    p = pathlib.Path(path_str)
    if not p.exists():
        print(f"  !! {path_str} not found — skipped")
        continue

    original = s = p.read_text()

    # Find the class, then its Meta.fields tuple.
    cls = re.search(rf'class {class_name}\b.*?(?=\nclass |\Z)', s, re.S)
    if not cls:
        print(f"  !! {class_name} not found in {path_str}")
        continue

    block = cls.group(0)
    fields = re.search(r'fields\s*=\s*\(([^)]*)\)', block, re.S)
    if not fields:
        print(f"  !! no Meta.fields tuple in {class_name}")
        continue

    names = [n.strip() for n in fields.group(1).split(",")]
    names = [n for n in names if n and n.strip("\"'") not in drop]
    rebuilt = "fields = (" + ", ".join(names) + ")"

    new_block = block[:fields.start()] + rebuilt + block[fields.end():]
    s = s.replace(block, new_block)
    p.write_text(s)

    try:
        ast.parse(s)
    except SyntaxError as exc:
        p.write_text(original)
        print(f"  !! edit to {path_str} would have broken it ({exc}) — rolled back")
        continue

    removed = [d for d in drop if d in block]
    print(f"  ✓ {class_name}: removed {removed or 'nothing (already clean)'}")

print("\nWhich serializer each view uses — check owner-facing views still")
print("use a WRITE serializer (those keep the contact fields):\n")
for path_str in ("apps/homeservices/views.py", "apps/marketplace/views.py"):
    p = pathlib.Path(path_str)
    if not p.exists():
        continue
    print(f"  {path_str}")
    current = None
    for line in p.read_text().splitlines():
        m = re.match(r'class (\w+)', line)
        if m:
            current = m.group(1)
        for ser in re.findall(r'(\w+Serializer)', line):
            if current:
                print(f"    {current:28s} -> {ser}")
    print()

print("No migration needed — serializer fields only. Restart the server.")
