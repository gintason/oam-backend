#!/usr/bin/env python3
"""
Mobile: show $ / £ / € instead of "USD" / "GBP" / "EUR" before prices
(marketplace listings and any other money() amount). Naira (₦) is unchanged.

Run from the mobile project root (the folder with app.json):

    python3 apply_money_symbols.py            # backs up src/shared/lib/format.ts.bak-money
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REL = "src/shared/lib/format.ts"
NEW = '''const CURRENCY_SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** Money with its currency symbol (₦, $, £, €); other currencies keep their code. */
export function money(v: string | number, currency = "NGN"): string {
  const code = (currency || "NGN").toUpperCase();
  if (code === "NGN") return naira(v);
  const amount = Number(v || 0).toLocaleString();
  const symbol = CURRENCY_SYMBOLS[code];
  return symbol ? `${symbol}${amount}` : `${code} ${amount}`;
}'''

if not (ROOT / "app.json").exists():
    sys.exit("Run this from the mobile project root (the folder with app.json).")
p = ROOT / REL
s = p.read_text(encoding="utf-8")
if "CURRENCY_SYMBOLS" in s:
    print("Already done: " + REL); sys.exit(0)
pat = re.compile(r'(/\*\*[^*]*?\*/\s*)?export function money\(v: string \| number, currency = "NGN"\): string \{\n.*?\n\}', re.S)
m = pat.search(s)
if not m:
    sys.exit(f"NEEDS ATTENTION: money() in {REL} isn't in the expected shape — replace it with:\n\n{NEW}")
bak = p.with_name(p.name + ".bak-money")
if not bak.exists():
    shutil.copy2(p, bak)
p.write_text(s[:m.start()] + NEW + s[m.end():], encoding="utf-8")
print("Changed: " + REL + "\n\nNext: npx expo start -c  (or eas update)")
