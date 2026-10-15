from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.payouts.models import BankAccount, WithdrawalOrder
from apps.payouts.services import WithdrawalService, alert_ops_if_needed
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService


class FakePaystack:
    """Paystack stand-in: a balance we control; transfers succeed if it covers them."""
    provider_key = "paystack"

    def __init__(self, balance):
        self.balance = Decimal(str(balance)) if balance is not None else None
        self.calls = []

    def get_balance(self, currency="NGN"):
        return self.balance

    def fetch_transfer_status(self, transfer_code):
        return getattr(self, "remote", {}).get(transfer_code)

    def initiate_transfer(self, *, amount, recipient_code, reference, currency="NGN", reason=""):
        self.calls.append(reference)
        if getattr(self, "refuse", ""):
            return {"status": "failed", "provider_reference": "", "raw": {"message": self.refuse}}
        if self.balance is not None and Decimal(str(amount)) > self.balance:
            return {"status": "failed", "provider_reference": "",
                    "raw": {"message": "Your balance is not enough to fulfil this request"}}
        if self.balance is not None:
            self.balance -= Decimal(str(amount))
        if getattr(self, "pending", False):
            return {"status": "pending", "provider_reference": f"TRF_{reference}", "raw": {"status": True}}
        return {"status": "success", "provider_reference": f"TRF_{reference}", "raw": {"status": True}}


@override_settings(SECURE_SSL_REDIRECT=False, OPS_ALERT_EMAILS=["ops@oam.test"],
                   WITHDRAWAL_QUEUE_KEY="sekret", WITHDRAWAL_QUEUE_MAX_HOURS=72,
                   EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class WithdrawalQueueTests(TestCase):
    def setUp(self):
        cache.clear()
        U = get_user_model()
        self.users, self.banks = [], []
        for i in range(3):
            u = U.objects.create_user(email=f"u{i}@oam.test", password="x-Pass-12345", is_verified=True)
            WalletService.credit(WalletService.get_or_create_wallet(u, "NGN"), Decimal("50000"), description="fund")
            self.users.append(u)
            self.banks.append(BankAccount.objects.create(user=u, bank_code="058", bank_name="GTBank",
                                                         account_number=f"00000000{i}", account_name=f"USER {i}",
                                                         recipient_code=f"RCP_{i}"))
        self.ps = FakePaystack(balance=160)
        self.patch = mock.patch("apps.payouts.services.ProviderFactory.get", return_value=self.ps)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def ops_mail(self):
        return [m for m in mail.outbox if "ops@oam.test" in m.to]

    def wallet(self, i):
        return Wallet.objects.get(user=self.users[i], currency="NGN").cached_balance

    def withdraw(self, i, amount):
        return WithdrawalService.withdraw(user=self.users[i], bank_account=self.banks[i], amount=Decimal(amount))

    def test_low_balance_queues_without_calling_paystack(self):
        o = self.withdraw(0, "10000")
        self.assertEqual(o.status, WithdrawalOrder.Status.QUEUED)
        self.assertEqual(self.ps.calls, [])                          # pre-check, no doomed transfer
        self.assertEqual(self.wallet(0), Decimal("50000") - Decimal("10025"))   # reserved, not refunded
        self.assertIsNotNone(o.queued_at)
        self.assertEqual(len(self.ops_mail()), 1)                     # ops alerted
        self.assertIn("Top up your Paystack balance by at least NGN 9,840.00", self.ops_mail()[0].body)
        self.assertEqual(len([m for m in mail.outbox if "u0@oam.test" in m.to]), 1)   # one email to the user

    def test_sent_automatically_after_top_up(self):
        o = self.withdraw(0, "10000")
        self.ps.balance = Decimal("20000")                            # owner tops up
        st = WithdrawalService.process_queue()
        o.refresh_from_db()
        self.assertEqual((st["sent"], o.status), (1, WithdrawalOrder.Status.SUCCESS))
        self.assertEqual(self.wallet(0), Decimal("50000") - Decimal("10025"))   # captured, not refunded

    def test_first_come_first_paid(self):
        a = self.withdraw(0, "10000")
        b = self.withdraw(1, "5000")                                  # joins the queue behind a
        self.assertEqual(b.status, WithdrawalOrder.Status.QUEUED)
        self.ps.balance = Decimal("12000")                            # covers a, not a + b
        WithdrawalService.process_queue()
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual(a.status, WithdrawalOrder.Status.SUCCESS)
        self.assertEqual(b.status, WithdrawalOrder.Status.QUEUED)
        self.ps.balance = Decimal("6000")
        WithdrawalService.process_queue()
        b.refresh_from_db()
        self.assertEqual(b.status, WithdrawalOrder.Status.SUCCESS)

    def test_rejected_transfer_gets_a_fresh_reference_on_retry(self):
        self.ps.get_balance = lambda currency="NGN": None             # balance unknown -> attempt
        o = self.withdraw(0, "10000")                                 # Paystack refuses (balance 160)
        self.assertEqual(o.status, WithdrawalOrder.Status.QUEUED)
        self.assertEqual(o.transfer_reference, f"{o.reference}-R1")
        self.ps.balance = Decimal("20000")
        WithdrawalService.process_queue()
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)
        self.assertEqual(self.ps.calls, [o.reference, f"{o.reference}-R1"])

    def test_customer_cancel_refunds(self):
        o = self.withdraw(0, "10000")
        api = APIClient(); api.force_authenticate(self.users[0])
        r = api.get("/api/v1/payouts/withdrawals/history/")
        row = r.json()["results"][0] if isinstance(r.json(), dict) else r.json()[0]
        self.assertEqual((row["status"], row["can_cancel"]), ("queued", True))
        self.assertIn("up to 24 hours", row["status_message"])
        r = api.post(f"/api/v1/payouts/withdrawals/{o.id}/cancel/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["status"], "cancelled")
        self.assertEqual(self.wallet(0), Decimal("50000"))           # all back, fee included
        self.assertEqual(api.post(f"/api/v1/payouts/withdrawals/{o.id}/cancel/").status_code, 400)
        other = APIClient(); other.force_authenticate(self.users[1])
        o2 = self.withdraw(0, "1000")
        self.assertEqual(other.post(f"/api/v1/payouts/withdrawals/{o2.id}/cancel/").status_code, 404)

    def test_overdue_withdrawals_are_refunded(self):
        o = self.withdraw(0, "10000")
        WithdrawalOrder.objects.filter(pk=o.pk).update(queued_at=timezone.now() - timedelta(hours=73))
        st = WithdrawalService.process_queue()
        o.refresh_from_db()
        self.assertEqual((st["refunded_overdue"], o.status), (1, WithdrawalOrder.Status.CANCELLED))
        self.assertEqual(self.wallet(0), Decimal("50000"))

    def test_customer_side_failures_still_fail_and_refund(self):
        self.ps.balance = Decimal("100000")
        self.ps.initiate_transfer = lambda **kw: {"status": "failed", "provider_reference": "",
                                                  "raw": {"message": "Invalid recipient"}}
        o = self.withdraw(0, "1000")
        self.assertEqual(o.status, WithdrawalOrder.Status.FAILED)
        self.assertEqual(self.wallet(0), Decimal("50000"))

    def test_queue_run_endpoint_needs_key(self):
        self.withdraw(0, "10000")
        api = APIClient()
        self.assertEqual(api.post("/api/v1/payouts/queue/run/").status_code, 404)
        self.assertEqual(api.post("/api/v1/payouts/queue/run/", HTTP_X_QUEUE_KEY="wrong").status_code, 404)
        self.ps.balance = Decimal("20000")
        r = api.get("/api/v1/payouts/queue/run/?key=sekret")
        self.assertEqual((r.status_code, r.json()["sent"]), (200, 1))

    def test_alert_throttled_unless_queue_grows(self):
        self.withdraw(0, "10000")
        self.assertEqual(len(self.ops_mail()), 1)
        self.assertFalse(alert_ops_if_needed("NGN"))                 # same total -> no repeat
        self.withdraw(1, "5000")                                      # total grew -> alert again
        self.assertEqual(len(self.ops_mail()), 2)
        self.assertIn("2 withdrawal(s) are waiting", self.ops_mail()[1].body)

    def test_alert_not_throttled_when_nobody_was_told(self):
        with override_settings(OPS_ALERT_EMAILS=[]):
            get_user_model().objects.filter(is_superuser=True).update(is_superuser=False)
            self.withdraw(0, "10000")
        self.assertEqual(len(self.ops_mail()), 0)
        self.assertTrue(alert_ops_if_needed("NGN"))                  # recipients now set -> sent at once
        self.assertEqual(len(self.ops_mail()), 1)

    def test_paystack_refusal_alert_says_contact_paystack_not_top_up(self):
        self.ps.refuse = "You cannot initiate third party payouts at this time"
        self.ps.balance = Decimal("50000")
        a = self.withdraw(0, "300")
        self.withdraw(1, "400")
        a.refresh_from_db()
        self.assertEqual(a.status, WithdrawalOrder.Status.QUEUED)       # money stays held
        mails = self.ops_mail()
        self.assertTrue(mails)
        self.assertIn("refusing transfers", mails[-1].subject)
        self.assertIn("topping up will NOT help", mails[-1].body)
        self.assertIn("third party payouts", mails[-1].body)
        self.assertNotIn("Top up your Paystack balance", mails[-1].body)
        n = len(self.ps.calls)
        st = WithdrawalService.process_queue(currency="NGN")
        self.assertEqual(st["still_queued"], 2)
        self.assertEqual(len(self.ps.calls), n + 1)                     # stops after the first refusal
        self.ps.refuse = ""                                             # Paystack re-enables payouts
        st = WithdrawalService.process_queue(currency="NGN")
        self.assertEqual((st["sent"], st["still_queued"]), (2, 0))

    def _processing(self, i, amount, code):
        self.ps.balance = Decimal("50000")
        self.ps.pending = True
        o = self.withdraw(i, amount)
        self.assertEqual(o.status, WithdrawalOrder.Status.PROCESSING)
        WithdrawalOrder.objects.filter(pk=o.pk).update(
            status=WithdrawalOrder.Status.PROCESSING, provider_reference=code,
            updated_at=timezone.now() - timedelta(minutes=10))
        return o

    def test_sync_finalises_missed_webhooks(self):
        ok = self._processing(0, "1000", "TRF_ok")
        gone = self._processing(1, "300", "TRF_gone")
        wait = self._processing(2, "500", "TRF_wait")
        self.ps.remote = {"TRF_ok": "success", "TRF_gone": "abandoned", "TRF_wait": "pending"}
        before_gone = self.wallet(1)
        st = WithdrawalService.sync_processing()
        self.assertEqual((st["completed"], st["refunded"], st["awaiting_otp"]), (1, 1, 0))
        for o in (ok, gone, wait):
            o.refresh_from_db()
        self.assertEqual(ok.status, WithdrawalOrder.Status.SUCCESS)
        self.assertEqual(gone.status, WithdrawalOrder.Status.FAILED)
        self.assertEqual(wait.status, WithdrawalOrder.Status.PROCESSING)
        self.assertEqual(self.wallet(1), before_gone + Decimal("300") + Decimal(str(gone.request_payload.get("fee", "0"))))
        self.assertTrue(Notification.objects.filter(user=self.users[1], title__icontains="didn't go through").exists())
        self.assertEqual(WithdrawalService.sync_processing()["completed"], 0)     # idempotent

    def test_sync_alerts_staff_about_otp_once(self):
        self._processing(0, "1000", "TRF_otp")
        self.ps.remote = {"TRF_otp": "otp"}
        self.assertEqual(WithdrawalService.sync_processing()["awaiting_otp"], 1)
        WithdrawalService.sync_processing()
        otp = [m for m in self.ops_mail() if "OTP" in m.subject]
        self.assertEqual(len(otp), 1)                                   # throttled
        self.assertIn("Confirm transfers before sending", otp[0].body)

    def test_payments_webhook_forwards_transfer_events(self):
        o = self._processing(0, "1000", "TRF_hook")
        gw = mock.Mock(); gw.verify_webhook.return_value = True
        body = {"event": "transfer.success", "data": {"reference": o.reference, "status": "success"}}
        with mock.patch("apps.payments.services.ProviderFactory.get", return_value=gw):
            r = APIClient().post("/api/v1/payments/webhook/paystack/", body, format="json")
        self.assertEqual(r.status_code, 200)
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)

    def test_queue_run_endpoint_also_syncs(self):
        o = self._processing(0, "1000", "TRF_ep")
        self.ps.remote = {"TRF_ep": "success"}
        r = APIClient().get("/api/v1/payouts/queue/run/?key=sekret")
        self.assertEqual(r.json()["synced"]["completed"], 1)
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)

    def test_webhook_resolves_retry_reference(self):
        self.ps.get_balance = lambda currency="NGN": None
        o = self.withdraw(0, "10000")
        WithdrawalOrder.objects.filter(pk=o.pk).update(status=WithdrawalOrder.Status.PROCESSING)
        WithdrawalService.apply_transfer_status(f"{o.reference}-R1", "success")
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)

    def test_admin_shows_queue_and_retry_now(self):
        admin = get_user_model().objects.create_superuser(email="boss@oam.test", password="Admin-pass-123!")
        c = self.client; c.force_login(admin)
        o = self.withdraw(0, "10000")
        r = c.get("/admin/payouts/withdrawalorder/")
        self.assertContains(r, "1 withdrawal(s) waiting")
        self.ps.balance = Decimal("20000")
        r = c.post("/admin/payouts/withdrawalorder/", {"action": "retry_now", "_selected_action": [str(o.id)]}, follow=True)
        self.assertContains(r, "Sent 1")
        o.refresh_from_db()
        self.assertEqual(o.status, WithdrawalOrder.Status.SUCCESS)
