#!/usr/bin/env python3
"""
Receipts can confirm a bank transfer as soon as it lands.

- GET /api/v1/payouts/withdrawals/<id>/ returns one of your withdrawals and, while
  it's still processing, re-checks it with Flutterwave/Paystack right away.
- Withdrawals now include bank_name (receipts showed just "Bank").

Install AFTER oam-flutterwave-fixed-ip-backend. Unzip in the backend root, then:
    python3 apply_withdrawal_receipt_status_backend.py
    python manage.py test apps.payouts --settings=config.settings.test
No migrations.
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"apps/payouts/views.py": [["        return Response(WithdrawalOrderSerializer(order).data, status=code)\\n\\n\\nclass CancelWithdrawalView(APIView):\\n    \\"\\"\\"POST /withdrawals/<id>/cancel/ — cancel your own queued withdrawal (refund).\\"\\"\\"\\n    permission_classes = [IsAuthenticated, IsVerified]\\n", "        return Response(WithdrawalOrderSerializer(order).data, status=code)\\n\\n\\nclass WithdrawalDetailView(APIView):\\n    \\"\\"\\"GET /withdrawals/<id>/ — one of your withdrawals, re-checked with the bank\\n    provider if it\'s still processing, so a receipt can flip to \\"successful\\".\\"\\"\\"\\n    permission_classes = [IsAuthenticated]\\n\\n    def get(self, request, withdrawal_id):\\n        order = WithdrawalOrder.objects.select_related(\\"bank_account\\").filter(\\n            id=withdrawal_id, user=request.user).first()\\n        if order is None:\\n            return Response({\\"detail\\": \\"Not found.\\"}, status=status.HTTP_404_NOT_FOUND)\\n        order = WithdrawalService.refresh(order)\\n        return Response(WithdrawalOrderSerializer(order).data)\\n\\n\\nclass CancelWithdrawalView(APIView):\\n    \\"\\"\\"POST /withdrawals/<id>/cancel/ — cancel your own queued withdrawal (refund).\\"\\"\\"\\n    permission_classes = [IsAuthenticated, IsVerified]\\n"]], "apps/payouts/urls.py": [["from .views import (\\n    BankAccountsView,\\n    CancelWithdrawalView,\\n    ProcessQueueView,\\n    BankListView,\\n    ResolveAccountView,\\n", "from .views import (\\n    BankAccountsView,\\n    CancelWithdrawalView,\\n    WithdrawalDetailView,\\n    ProcessQueueView,\\n    BankListView,\\n    ResolveAccountView,\\n"], ["    path(\\"banks/\\", BankAccountsView.as_view(), name=\\"payout-banks\\"),\\n    path(\\"withdrawals/\\", WithdrawView.as_view(), name=\\"payout-withdraw\\"),\\n    path(\\"withdrawals/history/\\", WithdrawalListView.as_view(), name=\\"payout-history\\"),\\n    path(\\"withdrawals/<uuid:withdrawal_id>/cancel/\\", CancelWithdrawalView.as_view(), name=\\"payout-cancel\\"),\\n    path(\\"queue/run/\\", ProcessQueueView.as_view(), name=\\"payout-queue-run\\"),\\n    path(\\"webhook/paystack/\\", WithdrawalWebhookView.as_view(), name=\\"payout-webhook\\"),\\n", "    path(\\"banks/\\", BankAccountsView.as_view(), name=\\"payout-banks\\"),\\n    path(\\"withdrawals/\\", WithdrawView.as_view(), name=\\"payout-withdraw\\"),\\n    path(\\"withdrawals/history/\\", WithdrawalListView.as_view(), name=\\"payout-history\\"),\\n    path(\\"withdrawals/<uuid:withdrawal_id>/\\", WithdrawalDetailView.as_view(), name=\\"payout-withdrawal-detail\\"),\\n    path(\\"withdrawals/<uuid:withdrawal_id>/cancel/\\", CancelWithdrawalView.as_view(), name=\\"payout-cancel\\"),\\n    path(\\"queue/run/\\", ProcessQueueView.as_view(), name=\\"payout-queue-run\\"),\\n    path(\\"webhook/paystack/\\", WithdrawalWebhookView.as_view(), name=\\"payout-webhook\\"),\\n"]], "apps/payouts/serializers.py": [["class WithdrawalOrderSerializer(serializers.ModelSerializer):\\n    account_name = serializers.CharField(source=\\"bank_account.account_name\\", read_only=True)\\n    account_number = serializers.CharField(source=\\"bank_account.account_number\\", read_only=True)\\n    # Plain-language status for the apps (\\"queued\\" = waiting for a top-up on OAM\'s side).\\n    status_message = serializers.SerializerMethodField()\\n    can_cancel = serializers.SerializerMethodField()\\n", "class WithdrawalOrderSerializer(serializers.ModelSerializer):\\n    account_name = serializers.CharField(source=\\"bank_account.account_name\\", read_only=True)\\n    account_number = serializers.CharField(source=\\"bank_account.account_number\\", read_only=True)\\n    bank_name = serializers.CharField(source=\\"bank_account.bank_name\\", read_only=True)\\n    # Plain-language status for the apps (\\"queued\\" = waiting for a top-up on OAM\'s side).\\n    status_message = serializers.SerializerMethodField()\\n    can_cancel = serializers.SerializerMethodField()\\n"], ["    class Meta:\\n        model = WithdrawalOrder\\n        fields = (\\"id\\", \\"amount\\", \\"currency\\", \\"status\\", \\"status_message\\", \\"can_cancel\\", \\"reference\\",\\n                  \\"provider\\", \\"provider_reference\\", \\"account_name\\", \\"account_number\\",\\n                  \\"failure_reason\\", \\"queued_at\\", \\"created_at\\", \\"updated_at\\")\\n        read_only_fields = fields\\n\\n", "    class Meta:\\n        model = WithdrawalOrder\\n        fields = (\\"id\\", \\"amount\\", \\"currency\\", \\"status\\", \\"status_message\\", \\"can_cancel\\", \\"reference\\",\\n                  \\"provider\\", \\"provider_reference\\", \\"account_name\\", \\"account_number\\", \\"bank_name\\",\\n                  \\"failure_reason\\", \\"queued_at\\", \\"created_at\\", \\"updated_at\\")\\n        read_only_fields = fields\\n\\n"]], "apps/payouts/services.py": [["        return o\\n\\n    @staticmethod\\n    def sync_processing(*, limit=100, min_age_minutes=2) -> dict:\\n        \\"\\"\\"Ask the provider about transfers still marked \\"processing\\" and finalise them.\\n\\n", "        return o\\n\\n    @staticmethod\\n    def refresh(order: WithdrawalOrder) -> WithdrawalOrder:\\n        \\"\\"\\"Ask the provider about one processing withdrawal right now (receipt polling).\\"\\"\\"\\n        if order.status != WithdrawalOrder.Status.PROCESSING or not order.provider_reference:\\n            return order\\n        try:\\n            provider = ProviderFactory.get(\\"payouts\\", order.provider or None)\\n            fetch = getattr(provider, \\"fetch_transfer_status\\", None)\\n            st = fetch(order.provider_reference) if fetch else None\\n        except Exception:\\n            logger.warning(\\"could not refresh withdrawal %s\\", order.reference)\\n            return order\\n        if st in _SUCCESS or st in _FAILED:\\n            return WithdrawalService.apply_transfer_status(\\n                order.transfer_reference or order.reference, st, raw={\\"synced_status\\": st}) or order\\n        return order\\n\\n    @staticmethod\\n    def sync_processing(*, limit=100, min_age_minutes=2) -> dict:\\n        \\"\\"\\"Ask the provider about transfers still marked \\"processing\\" and finalise them.\\n\\n"]], "apps/payouts/test_flutterwave_payouts.py": [["        ops = [m for m in mail.outbox if \\"ops@oam.test\\" in m.to]\\n        self.assertIn(\\"Top up your Flutterwave balance\\", ops[-1].body)\\n\\n    def test_sync_asks_the_provider_that_sent_it(self):\\n        o = self.run_with(FakeFlutterwave(balance=Decimal(\\"10000\\")))\\n        WithdrawalOrder.objects.filter(pk=o.pk).update(updated_at=o.updated_at.replace(year=2020))\\n", "        ops = [m for m in mail.outbox if \\"ops@oam.test\\" in m.to]\\n        self.assertIn(\\"Top up your Flutterwave balance\\", ops[-1].body)\\n\\n    def test_receipt_polling_flips_to_success(self):\\n        o = self.run_with(FakeFlutterwave(balance=Decimal(\\"10000\\")))\\n        self.assertEqual(o.status, WithdrawalOrder.Status.PROCESSING)\\n        c = APIClient(); c.force_authenticate(self.user)\\n        with mock.patch(\\"apps.payouts.services.ProviderFactory.get\\", return_value=FakeFlutterwave()):\\n            r = c.get(f\\"/api/v1/payouts/withdrawals/{o.id}/\\")\\n        self.assertEqual((r.status_code, r.data[\\"status\\"], r.data[\\"bank_name\\"]), (200, \\"success\\", \\"Fidelity Bank\\"))\\n        self.assertEqual(self.balance(), Decimal(\\"5000\\") - Decimal(\\"1025\\"))     # captured once\\n        other = get_user_model().objects.create_user(email=\\"x@oam.test\\", password=\\"x-Pass-12345\\", is_verified=True)\\n        c.force_authenticate(other)\\n        self.assertEqual(c.get(f\\"/api/v1/payouts/withdrawals/{o.id}/\\").status_code, 404)\\n\\n    def test_sync_asks_the_provider_that_sent_it(self):\\n        o = self.run_with(FakeFlutterwave(balance=Decimal(\\"10000\\")))\\n        WithdrawalOrder.objects.filter(pk=o.pk).update(updated_at=o.updated_at.replace(year=2020))\\n"]]}, "files": {}, "locales": {}}')
TAG = 'wdstatus'
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
