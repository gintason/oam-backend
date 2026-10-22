#!/usr/bin/env python3
"""
Web: wallet funding through Flutterwave returns to the right page.

Flutterwave sends every payment back to /payment/flutterwave-callback, which only
understood listing upgrades and boosts, so a wallet top-up showed "Couldn't
confirm payment". Wallet top-ups (FUND-...) are now handed to the wallet's own
return page, which confirms the payment and credits the wallet.

Unzip in the web project root (with package.json), then:
    python3 apply_flutterwave_fund_return_web.py
    npm run build
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"src/pages/services/FlutterwaveCallback.tsx": [[" * artisan profile boosts. Flutterwave sends every payment back to ONE redirect\\n * URL (FLUTTERWAVE_REDIRECT_URL) with ?status=&tx_ref=&transaction_id=, so this\\n * page reads tx_ref, works out which flow it was from the reference prefix\\n * (SUB- vs BOOST-), verifies with the backend — which re-checks with Flutterwave\\n * by that reference and activates the tier/boost — and reports the outcome.\\n * The verify endpoints are idempotent, so a refresh here is harmless.\\n */\\n", " * artisan profile boosts. Flutterwave sends every payment back to ONE redirect\\n * URL (FLUTTERWAVE_REDIRECT_URL) with ?status=&tx_ref=&transaction_id=, so this\\n * page reads tx_ref, works out which flow it was from the reference prefix\\n * (SUB- vs BOOST-; wallet funding FUND- is handed to /wallet/fund/callback), verifies with the backend — which re-checks with Flutterwave\\n * by that reference and activates the tier/boost — and reports the outcome.\\n * The verify endpoints are idempotent, so a refresh here is harmless.\\n */\\n"], ["    async function run() {\\n      if (!reference) {\\n        setPhase(\\"error\\");\\n        return;\\n      }\\n      // The customer cancelled on Flutterwave\'s page — nothing was charged.\\n", "    async function run() {\\n      if (!reference) {\\n        setPhase(\\"error\\");\\n        return;\\n      }\\n      // Wallet funding (FUND-...) now also runs on Flutterwave and returns here;\\n      // the wallet\'s own return page verifies it and credits the wallet.\\n      if (reference.startsWith(\\"FUND-\\")) {\\n        navigate(`/wallet/fund/callback?reference=${encodeURIComponent(reference)}`, { replace: true });\\n        return;\\n      }\\n      // The customer cancelled on Flutterwave\'s page — nothing was charged.\\n"]]}, "files": {}, "locales": {}}')
TAG = 'flwfund'
if not (ROOT / 'package.json').exists():
    print("Run this from the web project root (the folder with package.json)."); sys.exit(1)

plan, skipped = {}, []
for rel, pairs in DATA["edits"].items():
    p = ROOT / rel
    if not p.exists():
        print("Missing:", rel, "- nothing changed."); sys.exit(1)
    s = p.read_text(encoding="utf-8")
    if all(new in s for _, new in pairs):
        skipped.append(rel); continue
    for old, new in pairs:
        if s.count(old) != 1:
            print(rel, "doesn't look as expected - nothing changed. Send me that file and I'll adapt the update."); sys.exit(1)
        s = s.replace(old, new)
    plan[p] = s
for p, s in plan.items():
    shutil.copy2(p, p.with_name(p.name + ".bak-" + TAG))
    p.write_text(s, encoding="utf-8"); print("patched:", p.relative_to(ROOT))
for rel in skipped: print("already up to date:", rel)
for rel, text in DATA.get("files", {}).items():
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and p.read_text(encoding="utf-8") == text:
        print("up to date:", rel); continue
    p.write_text(text, encoding="utf-8"); print("wrote:", rel)
for base, (dirrel, langs) in DATA.get("locales", {}).items():
    d = ROOT / dirrel; n = 0
    for lang, kv in langs.items():
        p = d / (lang + ".json")
        if not p.exists(): continue
        raw = p.read_text(encoding="utf-8"); obj = json.loads(raw); node = obj
        for part in base.split("."): node = node.setdefault(part, {})
        node.update(kv)
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8"); n += 1
    print("translations:", base, "in", n, "languages")
print("Done.")
