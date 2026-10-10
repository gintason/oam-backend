"""
Read-only Paystack check. Run in the Render shell:
    python manage.py shell < paystack_check.py
Shows the Paystack balance that bank transfers are paid from, whether it covers
what customers hold in their wallets, and where OAM income settles.
Changes nothing; prints no keys.
"""
import requests
from django.conf import settings

key = (getattr(settings, "PROVIDER_CONFIG", {}).get("payouts", {}).get("paystack", {}) or {}).get("secret_key", "")
H = {"Authorization": f"Bearer {key}"}
print("Key type:", "LIVE" if key.startswith("sk_live") else "TEST" if key.startswith("sk_test") else "missing")

def get(path):
    try:
        return requests.get("https://api.paystack.co" + path, headers=H, timeout=20).json()
    except Exception as exc:  # network trouble shouldn't crash the check
        return {"status": False, "message": f"request failed ({exc.__class__.__name__})"}


r = get("/balance")
print("\nPaystack balance (bank transfers/withdrawals are paid from this):")
ngn = None
for b in (r.get("data") or []):
    amount = int(b.get("balance", 0)) / 100
    if b.get("currency") == "NGN":
        ngn = amount
    print(f"   {b.get('currency')}: {amount:,.2f}")
if not r.get("status"):
    print("   could not read balance:", r.get("message"))

from django.db.models import Sum
from apps.wallet.models import Wallet
owed = float(Wallet.objects.filter(currency="NGN").aggregate(t=Sum("cached_balance"))["t"] or 0)
print(f"\nCustomers hold in their NGN wallets: {owed:,.2f}")
if ngn is not None:
    if ngn >= owed:
        print("   OK — the Paystack balance covers every customer withdrawal.")
    else:
        print(f"   SHORT by {owed - ngn:,.2f} — top up the Paystack balance by at least this much.")

code = getattr(settings, "PAYSTACK_REVENUE_SUBACCOUNT_CODE", "") or getattr(settings, "PAYSTACK_DEPOSIT_SUBACCOUNT_CODE", "")
print("\nCustomer deposits: stay in the main Paystack balance (above).")
print("OAM income subaccount:", code or "(not set — OAM income also stays in the main balance)")
if code:
    s = get(f"/subaccount/{code}").get("data") or {}
    acct = str(s.get("account_number") or "")
    print("   business:", s.get("business_name"), "| bank:", s.get("settlement_bank"),
          "| account: ****" + acct[-4:])
    print("   settles:", s.get("settlement_schedule"), "| active:", s.get("active"))
    print("   -> seller/artisan upgrades and job plans paid through Paystack settle here.")
