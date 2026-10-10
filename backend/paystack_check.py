"""
Read-only Paystack check. Run in the Render shell:
    python manage.py shell < paystack_check.py
Shows the Paystack balance that bank transfers are paid from, and how the
deposit subaccount is set up. Changes nothing; prints no keys.
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
for b in (r.get("data") or []):
    print(f"   {b.get('currency')}: {int(b.get('balance', 0)) / 100:,.2f}")
if not r.get("status"):
    print("   could not read balance:", r.get("message"))

code = getattr(settings, "PAYSTACK_DEPOSIT_SUBACCOUNT_CODE", "")
print("\nPAYSTACK_DEPOSIT_SUBACCOUNT_CODE:", code or "(not set — deposits stay in the main balance)")
if code:
    s = get(f"/subaccount/{code}").get("data") or {}
    acct = str(s.get("account_number") or "")
    print("   business:", s.get("business_name"), "| bank:", s.get("settlement_bank"),
          "| account: ****" + acct[-4:])
    print("   settles:", s.get("settlement_schedule"), "| active:", s.get("active"))
    print("   -> every NGN card deposit is routed here in full, so it never reaches the balance above.")
