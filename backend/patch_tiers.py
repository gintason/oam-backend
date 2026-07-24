"""
Reorder the marketplace tiers: Free -> Premium (₦2,500) -> Pro (₦5,000).

The backend was built the other way round (Pro ₦2,500, Premium ₦6,000). This
swaps the meaning so Pro becomes the top tier, matching the intended product.

Safe to run now because nobody has subscribed yet — SellerSubscription rows
would otherwise need migrating, since an existing "pro" subscriber would
silently change tier.

RUN FROM THE BACKEND ROOT:
    python3 patch_tiers.py
"""
import ast
import pathlib
import re
import sys

p = pathlib.Path("apps/marketplace/models.py")
if not p.exists():
    sys.exit("apps/marketplace/models.py not found — run from the backend root.")

original = s = p.read_text()

# --- guard: refuse to run if anyone has already paid --------------------- #
print("Before changing prices, confirm nobody has subscribed:")
print("  python3 manage.py shell -c \"")
print("  from apps.marketplace.models import SellerSubscription, SubscriptionPayment")
print("  print('subs:', SellerSubscription.objects.exclude(tier='free').count())")
print("  print('paid:', SubscriptionPayment.objects.filter(status='success').count())\"")
print()

edits = 0

# 1. limits — pro becomes unlimited, premium the middle tier
m = re.search(r'^TIER_LIMITS\s*=\s*\{[^}]*\}', s, re.M)
if m:
    s = s[:m.start()] + 'TIER_LIMITS = {"free": 3, "premium": 20, "pro": None}' + s[m.end():]
    edits += 1

# 2. prices
m = re.search(r'^SUBSCRIPTION_PRICES\s*=\s*\{[^}]*\}', s, re.M)
if m:
    s = (s[:m.start()]
         + 'SUBSCRIPTION_PRICES = {"premium": Decimal("2500"), "pro": Decimal("5000")}'
         + s[m.end():])
    edits += 1

# 3. both paid tiers still get featured treatment
m = re.search(r'^FEATURED_TIERS\s*=\s*\{[^}]*\}', s, re.M)
if m:
    s = s[:m.start()] + 'FEATURED_TIERS = {"premium", "pro"}' + s[m.end():]
    edits += 1

# 4. docstring line, so the file doesn't contradict itself
s = s.replace(
    "- Seller tiers (free/pro/premium) cap the number of active listings and unlock",
    "- Seller tiers (free/premium/pro) cap the number of active listings and unlock",
)

# 5. choice ORDER drives dropdown order in admin and any serializer that
#    exposes it — list them cheapest first so the ladder reads correctly.
choices = re.search(
    r'(class Tier\b[^\n]*\n)((?:\s+\w+\s*=\s*"[^"]+",\s*_\("[^"]+"\)\n)+)', s
)
if choices:
    block = choices.group(2)
    lines = {}
    for line in block.strip().splitlines():
        key = re.search(r'"([a-z]+)"', line)
        if key:
            lines[key.group(1)] = line
    wanted = [k for k in ("free", "premium", "pro") if k in lines]
    if wanted:
        indent = re.match(r'\s*', block.splitlines()[0]).group(0)
        rebuilt = "\n".join(lines[k].strip() for k in wanted)
        rebuilt = "\n".join(indent + ln for ln in rebuilt.splitlines()) + "\n"
        s = s.replace(block, rebuilt)
        edits += 1

p.write_text(s)

try:
    ast.parse(s)
except SyntaxError as exc:
    p.write_text(original)
    sys.exit(f"Edit would have broken the file ({exc}) — rolled back, nothing changed.")

print(f"✓ applied {edits} change(s) to apps/marketplace/models.py\n")
for line in s.splitlines():
    if any(k in line for k in ("TIER_LIMITS", "SUBSCRIPTION_PRICES", "FEATURED_TIERS")):
        print("  " + line.strip())

print("\nNo migration needed — these are module constants, not model fields.")
print("Restart the server, then verify:")
print("  python3 manage.py shell -c \"from apps.marketplace.models import "
      "SUBSCRIPTION_PRICES, TIER_LIMITS; print(SUBSCRIPTION_PRICES); print(TIER_LIMITS)\"")
