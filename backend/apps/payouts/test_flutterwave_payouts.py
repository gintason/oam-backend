import json
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.payouts.models import BankAccount, WithdrawalOrder
from apps.payouts.services import WithdrawalService
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService
from integrations.base import ProviderFactory
from integrations.base.exceptions import ProviderAuthError, ProviderValidationError
from integrations.payouts.flutterwave.adapter import FlutterwavePayouts

BANKS = {"status": "success", "data": [
    {"id": 1, "code": "070", "name": "Fidelity Bank"},
    {"id": 2, "code": "058", "name": "GTBank Plc"},
    {"id": 3, "code": "100004", "name": "OPay"},
]}

CFG = {"flutterwave": {"secret_key": "FLWSECK-test", "secret_hash": "hash123"}}


def flw():
    return FlutterwavePayouts({"secret_key": "FLWSECK-test", "secret_hash": "hash123"})


class AdapterTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_banks_resolve_and_recipient(self):
        a = flw()
        with mock.patch.object(a, "get", return_value=BANKS) as g:
            self.assertEqual([b["code"] for b in a.list_banks()], ["070", "058", "100004"])
            a.list_banks()
            self.assertEqual(g.call_count, 1)                        # cached
        with mock.patch.object(a, "post", return_value={"status": "success", "data": {
                "account_number": "4011564651", "account_name": "O.A.M MOTORS LIMITED"}}) as p:
            r = a.resolve_account(account_number="4011564651", bank_code="070")
        p.assert_called_with("/accounts/resolve", json={"account_number": "4011564651", "account_bank": "070"})
        self.assertEqual((r["account_name"], r["bank_name"]), ("O.A.M MOTORS LIMITED", "Fidelity Bank"))
        self.assertEqual(a.create_recipient(name="x", account_number="4011564651", bank_code="070"),
                         "FLW:070:4011564651")

    def test_paystack_era_account_mapped_by_name(self):
        a = flw()
        acct = BankAccount(bank_code="999992", bank_name="OPay Digital Services Limited (OPay)",
                           account_number="8012345678", recipient_code="RCP_abc")
        with mock.patch.object(a, "get", return_value=BANKS):
            self.assertEqual(a.recipient_from_account(BankAccount(bank_code="058", bank_name="GTBank",
                                                                  account_number="0001", recipient_code="RCP_1")),
                             "FLW:058:0001")                         # same code on both
            acct.bank_name = "OPay"
            self.assertEqual(a.recipient_from_account(acct), "FLW:100004:8012345678")

    def test_transfer_sent_in_naira_major_units(self):
        a = flw()
        with mock.patch.object(a, "post", return_value={"status": "success", "message": "Transfer Queued Successfully",
                                                        "data": {"id": 987, "status": "NEW"}}) as p:
            r = a.initiate_transfer(amount=Decimal("1500.50"), recipient_code="FLW:070:4011564651",
                                    reference="WD-1", reason="OAM withdrawal WD-1")
        body = p.call_args.kwargs["json"]
        self.assertEqual((body["account_bank"], body["account_number"], body["amount"], body["reference"]),
                         ("070", "4011564651", 1500.5, "WD-1"))
        self.assertEqual((r["status"], r["provider_reference"]), ("pending", "987"))

    def test_refusals_keep_flutterwaves_message(self):
        a = flw()
        err = ProviderValidationError("flutterwave", "rejected (400)",
                                      raw={"status": "error", "message": "Please enable IP Whitelisting to access this service"})
        with mock.patch.object(a, "post", side_effect=err):
            r = a.initiate_transfer(amount=100, recipient_code="FLW:070:1", reference="WD-2")
        self.assertEqual(r["status"], "failed")
        self.assertIn("IP Whitelisting", r["raw"]["message"])
        with mock.patch.object(a, "post", side_effect=ProviderAuthError("flutterwave", "auth rejected", raw={})):
            r = a.initiate_transfer(amount=100, recipient_code="FLW:070:1", reference="WD-3")
        self.assertIn("auth rejected", r["raw"]["message"])

    def test_status_and_balance(self):
        a = flw()
        with mock.patch.object(a, "get", return_value={"status": "success", "data": {"id": 9, "status": "SUCCESSFUL"}}):
            self.assertEqual(a.fetch_transfer_status(9), "success")
        with mock.patch.object(a, "get", return_value={"status": "success", "data": {
                "currency": "NGN", "available_balance": 2371, "ledger_balance": 2371}}):
            self.assertEqual(a.get_balance("NGN"), Decimal("2371.00"))

    def test_only_transfer_calls_use_the_fixed_ip_proxy(self):
        a = FlutterwavePayouts({"secret_key": "k", "proxy_url": "http://user:pw@proxy.example:9293"})
        resp = mock.Mock(status_code=200)
        resp.json.return_value = {"status": "success", "data": {"id": 1, "status": "NEW"}}
        with mock.patch.object(a.session, "request", return_value=resp) as req:
            a.initiate_transfer(amount=100, recipient_code="FLW:070:1", reference="WD-P")
            self.assertEqual(req.call_args.kwargs["proxies"]["https"], "http://user:pw@proxy.example:9293")
            a.get_balance("NGN")
            self.assertNotIn("proxies", req.call_args.kwargs)
        b = flw()
        with mock.patch.object(b.session, "request", return_value=resp) as req:
            b.initiate_transfer(amount=100, recipient_code="FLW:070:1", reference="WD-Q")
            self.assertNotIn("proxies", req.call_args.kwargs)

    def test_webhook_signature(self):
        a = flw()
        self.assertTrue(a.verify_webhook(b"{}", {"verif-hash": "hash123"}))
        self.assertFalse(a.verify_webhook(b"{}", {"verif-hash": "nope"}))


class FakeFlutterwave:
    provider_key = "flutterwave"

    def __init__(self, balance=None, refuse=""):
        self.balance, self.refuse, self.sent = balance, refuse, []

    def get_balance(self, currency="NGN"):
        return self.balance

    def recipient_from_account(self, acct):
        return f"FLW:{acct.bank_code}:{acct.account_number}"

    def initiate_transfer(self, *, amount, recipient_code, reference, currency="NGN", reason=""):
        self.sent.append((recipient_code, reference))
        if self.refuse:
            return {"status": "failed", "provider_reference": "", "raw": {"message": self.refuse}}
        return {"status": "pending", "provider_reference": "555", "raw": {"status": "success"}}

    def fetch_transfer_status(self, tid):
        return "success"


@override_settings(SECURE_SSL_REDIRECT=False, OPS_ALERT_EMAILS=["ops@oam.test"],
                   EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class WithdrawalOnFlutterwaveTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(email="w@oam.test", password="x-Pass-12345", is_verified=True)
        WalletService.credit(WalletService.get_or_create_wallet(self.user, "NGN"), Decimal("5000"), description="fund")
        self.bank = BankAccount.objects.create(user=self.user, bank_code="070", bank_name="Fidelity Bank",
                                               account_number="4011564651", account_name="O.A.M",
                                               recipient_code="RCP_from_paystack")

    def balance(self):
        return Wallet.objects.get(user=self.user, currency="NGN").cached_balance

    def run_with(self, fake, amount="1000"):
        with mock.patch("apps.payouts.services.ProviderFactory.get", return_value=fake):
            return WithdrawalService.withdraw(user=self.user, bank_account=self.bank, amount=Decimal(amount))

    def test_paystack_era_account_paid_and_webhook_completes(self):
        fake = FakeFlutterwave(balance=Decimal("10000"))
        o = self.run_with(fake)
        self.assertEqual(fake.sent[0][0], "FLW:070:4011564651")          # built from the saved account
        self.assertEqual((o.status, o.provider, o.provider_reference), (WithdrawalOrder.Status.PROCESSING, "flutterwave", "555"))
        payload = {"event": "transfer.completed", "event.type": "Transfer",
                   "data": {"id": 555, "status": "SUCCESSFUL", "reference": o.reference, "amount": 1000}}
        with override_settings(PROVIDER_CONFIG={"payments": {"flutterwave": {"secret_hash": "hash123"}}}):
            r = APIClient().post("/api/v1/payments/webhook/flutterwave/", data=json.dumps(payload),
                                 content_type="application/json", HTTP_VERIF_HASH="hash123")
        self.assertEqual(r.status_code, 200)
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)
        self.assertEqual(self.balance(), Decimal("5000") - Decimal("1025"))
        from apps.notifications.models import Notification
        titles = list(Notification.objects.filter(user=self.user).order_by("created_at").values_list("title", flat=True))
        self.assertEqual(titles[-1], "Withdrawal successful")
        self.assertIn("Fidelity Bank (4011564651) was successful",
                      Notification.objects.filter(user=self.user, title="Withdrawal successful").first().body)
        # a repeated webhook doesn't notify twice
        with override_settings(PROVIDER_CONFIG={"payments": {"flutterwave": {"secret_hash": "hash123"}}}):
            APIClient().post("/api/v1/payments/webhook/flutterwave/", data=json.dumps(payload),
                             content_type="application/json", HTTP_VERIF_HASH="hash123")
        self.assertEqual(Notification.objects.filter(user=self.user, title="Withdrawal successful").count(), 1)

    def test_failed_webhook_refunds(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000")))
        payload = {"event": "transfer.completed", "data": {"id": 555, "status": "FAILED", "reference": o.reference}}
        with override_settings(PROVIDER_CONFIG={"payments": {"flutterwave": {"secret_hash": "hash123"}}}):
            APIClient().post("/api/v1/payments/webhook/flutterwave/", data=json.dumps(payload),
                             content_type="application/json", HTTP_VERIF_HASH="hash123")
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.FAILED)
        self.assertEqual(self.balance(), Decimal("5000"))

    def test_forged_webhook_ignored(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000")))
        payload = {"event": "transfer.completed", "data": {"id": 555, "status": "SUCCESSFUL", "reference": o.reference}}
        with override_settings(PROVIDER_CONFIG={"payments": {"flutterwave": {"secret_hash": "hash123"}}}):
            APIClient().post("/api/v1/payments/webhook/flutterwave/", data=json.dumps(payload),
                             content_type="application/json", HTTP_VERIF_HASH="wrong")
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.PROCESSING)

    def test_ip_not_whitelisted_queues_and_alerts(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000"),
                                          refuse="Please enable IP Whitelisting to access this service"))
        self.assertEqual(o.status, WithdrawalOrder.Status.QUEUED)       # held, not refunded
        self.assertEqual(self.balance(), Decimal("5000") - Decimal("1025"))
        ops = [m for m in mail.outbox if "ops@oam.test" in m.to]
        self.assertTrue(ops)
        self.assertIn("Flutterwave is refusing", ops[-1].subject)
        self.assertIn("Whitelisted IP addresses", ops[-1].body)

    def test_account_administrator_refusal_queues(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000"),
                                          refuse="This request cannot be processed. Please contact your account administrator"))
        self.assertEqual(o.status, WithdrawalOrder.Status.QUEUED)       # money stays reserved
        ops = [m for m in mail.outbox if "ops@oam.test" in m.to]
        self.assertIn("api.ipify.org", ops[-1].body)

    def test_low_flutterwave_balance_queues(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("200")))
        self.assertEqual(o.status, WithdrawalOrder.Status.QUEUED)
        ops = [m for m in mail.outbox if "ops@oam.test" in m.to]
        self.assertIn("Top up your Flutterwave balance", ops[-1].body)

    def test_receipt_polling_flips_to_success(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000")))
        self.assertEqual(o.status, WithdrawalOrder.Status.PROCESSING)
        c = APIClient(); c.force_authenticate(self.user)
        with mock.patch("apps.payouts.services.ProviderFactory.get", return_value=FakeFlutterwave()):
            r = c.get(f"/api/v1/payouts/withdrawals/{o.id}/")
        self.assertEqual((r.status_code, r.data["status"], r.data["bank_name"]), (200, "success", "Fidelity Bank"))
        self.assertEqual(self.balance(), Decimal("5000") - Decimal("1025"))     # captured once
        other = get_user_model().objects.create_user(email="x@oam.test", password="x-Pass-12345", is_verified=True)
        c.force_authenticate(other)
        self.assertEqual(c.get(f"/api/v1/payouts/withdrawals/{o.id}/").status_code, 404)

    def test_sync_asks_the_provider_that_sent_it(self):
        o = self.run_with(FakeFlutterwave(balance=Decimal("10000")))
        WithdrawalOrder.objects.filter(pk=o.pk).update(updated_at=o.updated_at.replace(year=2020))
        asked = []

        def get(category, key=None):
            asked.append(key)
            return FakeFlutterwave()
        with mock.patch("apps.payouts.services.ProviderFactory.get", side_effect=get):
            st = WithdrawalService.sync_processing()
        self.assertEqual((st["completed"], asked), (1, ["flutterwave"]))


class RegistryAndFundingTests(TestCase):
    def test_registered(self):
        self.assertIn(("payouts", "flutterwave"), ProviderFactory.registered())

    def test_naira_wallet_funding_offers_bank_transfer_and_ussd(self):
        from apps.payments.services import FundingService
        from integrations.payments.flutterwave.adapter import FlutterwaveGateway
        user = get_user_model().objects.create_user(email="f@oam.test", password="x-Pass-12345", is_verified=True)
        gw = FlutterwaveGateway({"secret_key": "k", "redirect_url": "https://oam-app.com/r"})
        with mock.patch("apps.payments.services.ProviderFactory.get", return_value=gw), \
             mock.patch.object(gw, "post", return_value={"status": "success", "data": {"link": "https://checkout"}}) as p:
            FundingService.initialize(user, Decimal("2000"), "NGN")
        body = p.call_args.kwargs["json"]
        self.assertEqual(body["payment_options"], "card,banktransfer,ussd")
        self.assertNotIn("payment_options", body["meta"])
