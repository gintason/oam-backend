#!/usr/bin/env python
"""
Fix: wallet funding paid on Paystack but never credited
("settle FUND-…: amount mismatch gateway=50762 txn=500.0000").

Paystack reports amounts in kobo (50762 = ₦507.62) and, with "pass fees to
customer" on, charges a little more than the deposit. The safety check compared
kobo to naira and demanded an exact match, so every Paystack deposit was refused.
Now it converts kobo, still refuses UNDERpayment and wrong currency, and accepts
a customer-paid fee on top. The wallet is credited the deposit amount (₦500).

Run from the backend root:   python3 apply_funding_fix.py
Then deploy, and credit the deposits that got stuck:
    python manage.py reconcile_payments --provider paystack --include-failed
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REL = "apps/payments/services.py"
MARK = "_reported_paid("

OLD = '''            reported_ccy = str(d.get("currency", "")).upper()
            try:
                reported_amt = Decimal(str(d.get("amount", "0")))
            except Exception:
                reported_amt = Decimal("0")
            if reported_ccy and reported_ccy != txn.currency.upper():
                logger.error("settle %s: currency mismatch gateway=%s txn=%s",
                             reference, reported_ccy, txn.currency)
                return txn
            if reported_amt and reported_amt != txn.amount:
                logger.error("settle %s: amount mismatch gateway=%s txn=%s",
                             reference, reported_amt, txn.amount)
                return txn
'''
NEW = '''            reported_ccy = str(d.get("currency", "")).upper()
            if reported_ccy and reported_ccy != txn.currency.upper():
                logger.error("settle %s: currency mismatch gateway=%s txn=%s",
                             reference, reported_ccy, txn.currency)
                return txn
            paid = _reported_paid(txn.provider, d)
            # Underpayment is refused. Paying MORE is normal: with "pass fees to
            # customer" on, Paystack charges e.g. ₦507.62 for a ₦500 deposit.
            if paid is not None and paid < txn.amount:
                logger.error("settle %s: amount mismatch gateway=%s txn=%s",
                             reference, paid, txn.amount)
                return txn
'''
HELPER = '''def _to_decimal(v):
    try:
        return Decimal(str(v)) if v not in (None, "") else None
    except Exception:
        return None


def _reported_paid(provider: str, d: dict):
    """
    What the gateway says was paid, in MAJOR units (naira, dollars), or None.

    Paystack reports kobo/cents (50762 = ₦507.62) and, when fees are passed to
    the customer, `requested_amount` is the original amount before fees.
    Flutterwave reports major units (`amount`; `charged_amount` includes fees).
    """
    if (provider or "").lower() == "paystack":
        req, amt = _to_decimal(d.get("requested_amount")), _to_decimal(d.get("amount"))
        vals = [v / 100 for v in (req, amt) if v]
        return max(vals) if vals else None
    vals = [v for v in (_to_decimal(d.get("amount")), _to_decimal(d.get("charged_amount"))) if v]
    return max(vals) if vals else None


class WebhookService:'''


def main():
    p = ROOT / REL
    if not p.exists():
        print(f"{REL} not found — run this from the backend root (the folder with manage.py).")
        sys.exit(1)
    text = p.read_text(encoding="utf-8")
    if MARK in text:
        print(f"Already applied: {REL}")
        return
    if OLD not in text or "class WebhookService:" not in text:
        print(f"NEEDS ATTENTION: couldn't find the amount check in {REL}. Send it to me and I'll patch it.")
        sys.exit(2)
    if "--check" in sys.argv:
        print(f"Would change: {REL}")
        return
    bak = p.with_name(p.name + ".bak-funding")
    if not bak.exists():
        shutil.copy2(p, bak)
    text = text.replace(OLD, NEW, 1).replace("class WebhookService:", HELPER, 1)
    p.write_text(text, encoding="utf-8")
    print(f"Changed: {REL}")
    print("\nAfter deploying, credit stuck deposits:\n"
          "  python manage.py reconcile_payments --provider paystack --include-failed")


if __name__ == "__main__":
    main()
