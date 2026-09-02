#!/usr/bin/env python3
"""
Add a wallet -> bank transfer fee (OAM revenue) to the payout/withdrawal flow.

Fee schedule (NGN): ₦25 for transfers of ₦500 and above, ₦10 below ₦500.
The user's wallet is debited `amount + fee`; the bank receives `amount`; the
`fee` is booked to OAM revenue on capture. On failure the whole hold (amount +
fee) is released.

RUN FROM BACKEND ROOT:
    python3 transfer_fee_patch/apply_transfer_fee.py
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
path = os.path.join(ROOT, "apps/payouts/services.py")

if not os.path.exists(path):
    sys.exit(f"ABORT: not found: {path}")

s = open(path, encoding="utf-8").read()


def apply(old, new, label):
    global s
    if new in s:
        print(f"  = {label}: already applied")
        return
    if s.count(old) != 1:
        sys.exit(f"ABORT: anchor for {label} not found exactly once")
    s = s.replace(old, new, 1)
    print(f"  + {label}")


# 1) fee helper (next to _wd_ref)
apply(
    'def _wd_ref() -> str:',
    'def _transfer_fee(amount, currency="NGN"):\n'
    '    """Wallet -> bank transfer fee (OAM revenue). ₦25 from ₦500+, else ₦10. NGN only."""\n'
    '    from decimal import Decimal\n'
    '    if str(currency).upper() != "NGN":\n'
    '        return Decimal("0")\n'
    '    return Decimal("25") if Decimal(str(amount)) >= Decimal("500") else Decimal("10")\n'
    '\n'
    '\n'
    'def _wd_ref() -> str:',
    "fee helper",
)

# 2) create_and_hold: hold amount + fee, store fee
apply(
    '''        amount = Decimal(str(amount))
        wallet = WalletService.get_or_create_wallet(user, currency)
        with transaction.atomic():
            order = WithdrawalOrder.objects.create(
                user=user, wallet=wallet, bank_account=bank_account,
                amount=amount, currency=currency.upper(), reference=_wd_ref(),
                status=WithdrawalOrder.Status.PENDING,
                request_payload={"amount": str(amount), "bank_account": str(bank_account.id)},
            )
            WalletService.hold(wallet, amount, reference=order.reference,
                               description=f"Withdrawal hold {order.reference}",
                               metadata={"withdrawal": str(order.id)})''',
    '''        amount = Decimal(str(amount))
        fee = _transfer_fee(amount, currency)
        total = amount + fee
        wallet = WalletService.get_or_create_wallet(user, currency)
        with transaction.atomic():
            order = WithdrawalOrder.objects.create(
                user=user, wallet=wallet, bank_account=bank_account,
                amount=amount, currency=currency.upper(), reference=_wd_ref(),
                status=WithdrawalOrder.Status.PENDING,
                request_payload={"amount": str(amount), "fee": str(fee), "total": str(total),
                                 "bank_account": str(bank_account.id)},
            )
            WalletService.hold(wallet, total, reference=order.reference,
                               description=f"Withdrawal hold {order.reference}",
                               metadata={"withdrawal": str(order.id), "fee": str(fee)})''',
    "create_and_hold holds amount+fee",
)

# 3) _capture: split cost (amount -> bank) vs revenue (fee -> OAM)
apply(
    '''    def _capture(order):
        WalletService.capture(order.currency, order.amount, reference=order.reference,
                              counterpart_code=PAYOUT_ACCOUNT,
                              description=f"Withdrawal capture {order.reference}",
                              metadata={"withdrawal": str(order.id)})''',
    '''    def _capture(order):
        fee = Decimal(str((order.request_payload or {}).get("fee", "0")))
        total = order.amount + fee
        WalletService.capture(order.currency, total, reference=order.reference,
                              cost=order.amount, counterpart_code=PAYOUT_ACCOUNT,
                              description=f"Withdrawal capture {order.reference}",
                              metadata={"withdrawal": str(order.id), "fee": str(fee)})''',
    "_capture splits fee to revenue",
)

# 4) _release: release the whole hold (amount + fee)
apply(
    '''    def _release(order):
        WalletService.release(order.wallet, order.amount, reference=order.reference,
                              description=f"Withdrawal refund {order.reference}",
                              metadata={"withdrawal": str(order.id)})''',
    '''    def _release(order):
        fee = Decimal(str((order.request_payload or {}).get("fee", "0")))
        total = order.amount + fee
        WalletService.release(order.wallet, total, reference=order.reference,
                              description=f"Withdrawal refund {order.reference}",
                              metadata={"withdrawal": str(order.id)})''',
    "_release refunds amount+fee",
)

open(path, "w", encoding="utf-8").write(s)
print("\nDONE. Wallet->bank transfer fee active (₦25 from ₦500+, else ₦10).")
