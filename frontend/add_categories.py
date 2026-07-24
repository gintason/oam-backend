"""
Add marketplace categories: Clothes, Accessories, Equipment, Others.

These live in the database, so once added they appear EVERYWHERE automatically:
the Post an item dropdown, the Browse Items tabs, and the filters. Only the
landing page needs a matching frontend change, because its tabs are still
mock data.

A NOTE ON TWO SPELLINGS
  You wrote "Accessaries" and "Equipments". I've used "Accessories" and
  "Equipment", which are the standard spellings — a visible misspelling in a
  primary navigation tab is the kind of thing that quietly costs trust on a
  marketplace handling real money.

  If you'd rather keep your originals, or use "Equipments" (which is common in
  Nigerian English), just edit the NAMES list below before running. The slug is
  what the code matches on, so the label can say anything.

RUN FROM THE BACKEND ROOT:
    python3 manage.py shell < add_categories.py
"""
from django.utils.text import slugify

from apps.marketplace.models import Category

# (name, slug, description)
NEW = [
    ("Clothes", "clothes", "Men's, women's and children's clothing"),
    ("Accessories", "accessories", "Bags, watches, jewellery and personal accessories"),
    ("Equipment", "equipment", "Tools, machinery and professional equipment"),
    ("Others", "others", "Anything that doesn't fit the categories above"),
]

existing = {c.slug: c for c in Category.objects.all()}
start_order = (max((c.order or 0) for c in existing.values()) + 1) if existing else 0

created = 0
for i, (name, slug, description) in enumerate(NEW):
    slug = slug or slugify(name)
    if slug in existing:
        print(f"  exists : {name} ({slug})")
        continue
    Category.objects.create(
        name=name,
        slug=slug,
        description=description,
        icon="",
        is_admin_only=False,
        is_active=True,
        # "Others" is deliberately last — it's the fallback, and a catch-all
        # sitting mid-list pulls listings that belong somewhere more specific.
        order=start_order + (900 if slug == "others" else i),
    )
    created += 1
    print(f"  created: {name} ({slug})")

print(f"\n{created} added.\n")
print("All marketplace categories, in tab order:")
for c in Category.objects.filter(is_active=True).order_by("order", "name"):
    flag = "  [admin only]" if c.is_admin_only else ""
    print(f"  {c.order:>4}  {c.name:<22} {c.slug}{flag}")
