#!/usr/bin/env python3
"""
Make International Airtime (Reloadly) card top-ups charge via FLUTTERWAVE
instead of the default gateway (Paystack).

Run from the backend root (the folder that contains `apps/`):
    python apply_reloadly_flutterwave.py

Guarded (aborts on anchor mismatch) and idempotent (safe to run twice).
"""
import sys, pathlib

TARGET = pathlib.Path("apps/reloadly/topup.py")
OLD = 'FundingService.initialize(topup.user, topup.total_ngn, "NGN")'
NEW = 'FundingService.initialize(topup.user, topup.total_ngn, "NGN", provider_key="flutterwave")'

if not TARGET.exists():
    sys.exit(f"ABORT: {TARGET} not found. Run this from the backend root (where 'apps/' lives).")

src = TARGET.read_text()

if NEW in src:
    print("Already applied — international airtime card top-ups already use Flutterwave. No change made.")
    sys.exit(0)

if OLD not in src:
    sys.exit(
        "ABORT: expected call not found in apps/reloadly/topup.py (anchor mismatch).\n"
        "       Looking for:  " + OLD + "\n"
        "       Nothing was changed. Send me the file and I'll adjust the anchor."
    )

TARGET.write_text(src.replace(OLD, NEW, 1))
print("Done - international airtime card top-ups now initialize the charge via Flutterwave "
      "(provider_key='flutterwave'). No other payment path is affected.")
