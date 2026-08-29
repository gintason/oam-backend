#!/usr/bin/env python3
"""
Enforce a ₦100 minimum on wallet -> bank withdrawals (payouts).

RUN FROM BACKEND ROOT:
    python3 withdraw_min_patch/apply_withdraw_min.py
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
path = os.path.join(ROOT, "apps/payouts/serializers.py")

if not os.path.exists(path):
    sys.exit(f"ABORT: not found: {path}")

s = open(path, encoding="utf-8").read()
old = (
    "    def validate_amount(self, value):\n"
    "        if value <= 0:\n"
    "            raise serializers.ValidationError(\"Amount must be positive.\")\n"
    "        return value"
)
new = (
    "    def validate_amount(self, value):\n"
    "        if value < 100:\n"
    "            raise serializers.ValidationError(\"Minimum withdrawal is \u20a6100.\")\n"
    "        return value"
)

if new in s:
    print("= already applied")
elif s.count(old) != 1:
    sys.exit("ABORT: validate_amount anchor not found exactly once")
else:
    open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))
    print("+ payouts: withdrawal minimum set to \u20a6100")

print("DONE.")
