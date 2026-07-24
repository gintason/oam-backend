"""
Align artisan boost packages with the Premium / Pro tier names.

BEFORE:  {7 days: ₦800, 30 days: ₦2,000}
AFTER:   {30 days: ₦2,500, 90 days: ₦5,000}
         Premium = 30 days, Pro = 90 days

WHY THESE DURATIONS
  You asked for the same tier NAMES in both verticals, but artisans buy a timed
  boost rather than a subscription, so a tier here has to mean a length of
  time. Pricing Pro at 90 days makes it ₦1,667/month against Premium's ₦2,500 —
  the longer commitment is cheaper per month, which is what makes it worth
  taking. Equal monthly rates would give an artisan no reason to pay more up
  front.

  Prices and durations are server-side and validated against these keys, so a
  caller cannot name their own price. That was already true — worth keeping.

TO CHOOSE DIFFERENT NUMBERS
  Edit the PACKAGES line below before running, or edit BOOST_PACKAGES in
  apps/homeservices/models.py afterwards. Nothing else depends on the values.

RUN FROM THE BACKEND ROOT:
    python3 patch_boost.py
"""
import ast
import pathlib
import re
import sys

# tier name -> (days, price)
PACKAGES = {"premium": (30, "2500"), "pro": (90, "5000")}

p = pathlib.Path("apps/homeservices/models.py")
if not p.exists():
    sys.exit("apps/homeservices/models.py not found — run from the backend root.")

original = s = p.read_text()

pkg_literal = ", ".join(f'{days}: Decimal("{price}")'
                        for days, price in PACKAGES.values())

m = re.search(r'^BOOST_PACKAGES\s*=\s*\{[^}]*\}', s, re.M)
if not m:
    sys.exit("Could not find BOOST_PACKAGES.")
s = s[:m.start()] + f'BOOST_PACKAGES = {{{pkg_literal}}}' + s[m.end():]

# Name the tiers alongside the packages so the frontend and backend agree on
# what "Premium" means without the label being hardcoded in two places.
if "BOOST_TIERS" not in s:
    tier_literal = ", ".join(f'"{name}": {days}' for name, (days, _) in PACKAGES.items())
    s = s.replace(
        "DEFAULT_BOOST_DAYS",
        f'# tier name -> days, so the API can speak in tiers rather than raw durations\n'
        f'BOOST_TIERS = {{{tier_literal}}}\n\nDEFAULT_BOOST_DAYS',
        1,
    )

# default to the entry tier
s = re.sub(r'^DEFAULT_BOOST_DAYS\s*=\s*\d+', 
           f'DEFAULT_BOOST_DAYS = {PACKAGES["premium"][0]}', s, count=1, flags=re.M)

p.write_text(s)

try:
    ast.parse(s)
except SyntaxError as exc:
    p.write_text(original)
    sys.exit(f"Edit would have broken the file ({exc}) — rolled back.")

print("✓ patched apps/homeservices/models.py\n")
for line in s.splitlines():
    if line.startswith(("BOOST_PACKAGES", "BOOST_TIERS", "DEFAULT_BOOST_DAYS")):
        print("  " + line)

print("\nNo migration needed — module constants only.")
print("\nCheck nobody has already bought a boost at the old prices:")
print('  python3 manage.py shell -c "from apps.homeservices.models import BoostPayment; '
      "print('paid boosts:', BoostPayment.objects.filter(status='success').count())\"")
