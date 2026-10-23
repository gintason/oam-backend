#!/usr/bin/env python3
"""
Customers get a "Withdrawal successful" notification when the money lands.

Until now they only got "Withdrawal processing" (sent when they press Send). Now,
when the bank confirms - instantly, or later via webhook / cron / receipt check -
they also get "Withdrawal successful: Your withdrawal of NGN 300.00 to First Bank
PLC (3114234602) was successful." (in-app + email). Sent once per withdrawal.

Install AFTER oam-withdrawal-receipt-status-backend. Unzip in the backend root, then:
    python3 apply_withdrawal_success_notice_backend.py
    python manage.py test apps.payouts --settings=config.settings.test
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"apps/payouts/services.py": [["                if status in _SUCCESS:\\n                    WithdrawalService._capture(o)\\n                    o.status = WithdrawalOrder.Status.SUCCESS\\n                elif status in _FAILED:\\n                    _raw = result.get(\\"raw\\", {}) or {}\\n                    _reason = str(_raw.get(\\"message\\") or _raw.get(\\"error\\") or \\"\\").strip()\\n", "                if status in _SUCCESS:\\n                    WithdrawalService._capture(o)\\n                    o.status = WithdrawalOrder.Status.SUCCESS\\n                    transaction.on_commit(lambda o=o: _notify_success(o))\\n                elif status in _FAILED:\\n                    _raw = result.get(\\"raw\\", {}) or {}\\n                    _reason = str(_raw.get(\\"message\\") or _raw.get(\\"error\\") or \\"\\").strip()\\n"], ["                stats[\\"failed\\"] += 1\\n            else:\\n                stats[\\"sent\\"] += 1\\n                if result.status == WithdrawalOrder.Status.SUCCESS or result.provider_reference:\\n                    _notify_user(result, \\"Transfer sent\\",\\n                                 f\\"Your transfer of {result.currency} {result.amount:,.2f} has been sent to your bank.\\")\\n        if stats[\\"still_queued\\"]:\\n", "                stats[\\"failed\\"] += 1\\n            else:\\n                stats[\\"sent\\"] += 1\\n                # (an instant success already got \\"Withdrawal successful\\" from execute)\\n                if result.status != WithdrawalOrder.Status.SUCCESS and result.provider_reference:\\n                    _notify_user(result, \\"Transfer sent\\",\\n                                 f\\"Your transfer of {result.currency} {result.amount:,.2f} has been sent to your bank.\\")\\n        if stats[\\"still_queued\\"]:\\n"], ["                            WithdrawalOrder.Status.REVERSED, WithdrawalOrder.Status.CANCELLED):\\n                return o\\n            refunded = False\\n            if status in _SUCCESS:\\n                WithdrawalService._capture(o)\\n                o.status = WithdrawalOrder.Status.SUCCESS\\n            elif status in _FAILED:\\n                WithdrawalService._release(o)\\n                o.status = (WithdrawalOrder.Status.REVERSED if status == \\"reversed\\"\\n", "                            WithdrawalOrder.Status.REVERSED, WithdrawalOrder.Status.CANCELLED):\\n                return o\\n            refunded = False\\n            succeeded = False\\n            if status in _SUCCESS:\\n                WithdrawalService._capture(o)\\n                o.status = WithdrawalOrder.Status.SUCCESS\\n                succeeded = True\\n            elif status in _FAILED:\\n                WithdrawalService._release(o)\\n                o.status = (WithdrawalOrder.Status.REVERSED if status == \\"reversed\\"\\n"], ["            if raw:\\n                o.response_payload = {**(o.response_payload or {}), \\"webhook\\": raw}\\n            o.save(update_fields=[\\"status\\", \\"response_payload\\", \\"failure_reason\\", \\"updated_at\\"])\\n        if refunded:\\n            _notify_user(o, \\"Transfer didn\'t go through\\",\\n                         f\\"Your transfer of {o.currency} {o.amount:,.2f} couldn\'t be completed, so the money \\"\\n", "            if raw:\\n                o.response_payload = {**(o.response_payload or {}), \\"webhook\\": raw}\\n            o.save(update_fields=[\\"status\\", \\"response_payload\\", \\"failure_reason\\", \\"updated_at\\"])\\n        if succeeded:\\n            _notify_success(o)\\n        if refunded:\\n            _notify_user(o, \\"Transfer didn\'t go through\\",\\n                         f\\"Your transfer of {o.currency} {o.amount:,.2f} couldn\'t be completed, so the money \\"\\n"], ["# --------------------------------------------------------------------------- #\\n# Notifications\\n# --------------------------------------------------------------------------- #\\ndef _notify_user(order, title, body, *, email=True):\\n    try:\\n        from apps.notifications.services import notify\\n", "# --------------------------------------------------------------------------- #\\n# Notifications\\n# --------------------------------------------------------------------------- #\\ndef _notify_success(order):\\n    \\"\\"\\"Tell the customer the money has reached their bank.\\"\\"\\"\\n    acct = getattr(order, \\"bank_account\\", None)\\n    bank = (getattr(acct, \\"bank_name\\", \\"\\") or \\"your bank\\") if acct else \\"your bank\\"\\n    num = getattr(acct, \\"account_number\\", \\"\\") if acct else \\"\\"\\n    to = f\\"{bank} ({num})\\" if num else bank\\n    _notify_user(order, \\"Withdrawal successful\\",\\n                 f\\"Your withdrawal of {order.currency} {order.amount:,.2f} to {to} was successful.\\")\\n\\n\\ndef _notify_user(order, title, body, *, email=True):\\n    try:\\n        from apps.notifications.services import notify\\n"]], "apps/payouts/test_flutterwave_payouts.py": [["        o.refresh_from_db()\\n        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)\\n        self.assertEqual(self.balance(), Decimal(\\"5000\\") - Decimal(\\"1025\\"))\\n\\n    def test_failed_webhook_refunds(self):\\n        o = self.run_with(FakeFlutterwave(balance=Decimal(\\"10000\\")))\\n", "        o.refresh_from_db()\\n        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)\\n        self.assertEqual(self.balance(), Decimal(\\"5000\\") - Decimal(\\"1025\\"))\\n        from apps.notifications.models import Notification\\n        titles = list(Notification.objects.filter(user=self.user).order_by(\\"created_at\\").values_list(\\"title\\", flat=True))\\n        self.assertEqual(titles[-1], \\"Withdrawal successful\\")\\n        self.assertIn(\\"Fidelity Bank (4011564651) was successful\\",\\n                      Notification.objects.filter(user=self.user, title=\\"Withdrawal successful\\").first().body)\\n        # a repeated webhook doesn\'t notify twice\\n        with override_settings(PROVIDER_CONFIG={\\"payments\\": {\\"flutterwave\\": {\\"secret_hash\\": \\"hash123\\"}}}):\\n            APIClient().post(\\"/api/v1/payments/webhook/flutterwave/\\", data=json.dumps(payload),\\n                             content_type=\\"application/json\\", HTTP_VERIF_HASH=\\"hash123\\")\\n        self.assertEqual(Notification.objects.filter(user=self.user, title=\\"Withdrawal successful\\").count(), 1)\\n\\n    def test_failed_webhook_refunds(self):\\n        o = self.run_with(FakeFlutterwave(balance=Decimal(\\"10000\\")))\\n"]]}, "files": {}, "locales": {}}')
TAG = 'wdnotify'
if not (ROOT / 'manage.py').exists():
    print("Run this from the backend root (the folder with manage.py)."); sys.exit(1)

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
