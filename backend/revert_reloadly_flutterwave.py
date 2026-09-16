#!/usr/bin/env python3
"""
Revert the international-airtime Flutterwave change (back to the default gateway),
so /reloadly/buy/ stops 502-ing while we diagnose. Run from the backend root.
Guarded + idempotent.
"""
import sys, pathlib
T = pathlib.Path("apps/reloadly/topup.py")
NEW = 'FundingService.initialize(topup.user, topup.total_ngn, "NGN", provider_key="flutterwave")'
OLD = 'FundingService.initialize(topup.user, topup.total_ngn, "NGN")'
if not T.exists(): sys.exit("ABORT: run from backend root (folder with 'apps/').")
s = T.read_text()
if NEW not in s:
    print("Nothing to revert (Flutterwave line not present)."); sys.exit(0)
T.write_text(s.replace(NEW, OLD, 1))
print("Reverted - airtime card charge uses the default gateway again. /reloadly/buy/ should stop erroring.")
