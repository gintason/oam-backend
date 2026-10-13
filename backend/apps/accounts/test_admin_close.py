from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.wallet.services import WalletService

User = get_user_model()
URL = "/admin/accounts/user/"


@override_settings(SECURE_SSL_REDIRECT=False)
class CloseAndAnonymiseAdminTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="boss@oam.test", password="Admin-pass-123!")
        self.client.force_login(self.admin)
        self.plain = User.objects.create_user(email="plain@oam.test", password="x-Pass-12345")
        # A user with money history: the built-in delete is blocked by PROTECTed ledger rows.
        self.money = User.objects.create_user(email="money@oam.test", password="x-Pass-12345")
        w = WalletService.get_or_create_wallet(self.money, "NGN")
        WalletService.credit(w, Decimal("500"), description="fund")
        WalletService.debit(w, Decimal("500"), description="spend")
        self.rich = User.objects.create_user(email="rich@oam.test", password="x-Pass-12345")
        WalletService.credit(WalletService.get_or_create_wallet(self.rich, "NGN"), Decimal("200"), description="fund")

    def post(self, ids, **extra):
        return self.client.post(URL, {"action": "close_and_anonymise", "_selected_action": [str(i) for i in ids], **extra}, follow=True)

    def test_action_listed(self):
        r = self.client.get(URL)
        self.assertContains(r, "Close &amp; anonymise selected accounts")

    def test_confirmation_page_changes_nothing(self):
        r = self.post([self.money.pk, self.rich.pk])
        self.assertContains(r, "Will be closed")
        self.assertContains(r, "Will be skipped")
        self.money.refresh_from_db()
        self.assertTrue(self.money.is_active)

    def test_confirm_closes_user_with_money_history_and_keeps_wallet(self):
        from apps.wallet.models import Wallet
        r = self.post([self.money.pk, self.plain.pk], confirm="yes")
        self.assertEqual(r.status_code, 200)
        for u in (self.money, self.plain):
            u.refresh_from_db()
            self.assertFalse(u.is_active)
            self.assertTrue(u.email.endswith("@deleted.invalid"))
            self.assertFalse(u.has_usable_password())
        self.assertTrue(Wallet.objects.filter(user=self.money).exists())

    def test_skips_balance_superuser_and_self(self):
        other_super = User.objects.create_superuser(email="su2@oam.test", password="Admin-pass-123!")
        r = self.post([self.rich.pk, other_super.pk, self.admin.pk], confirm="yes")
        self.assertContains(r, "Skipped rich@oam.test")
        self.assertContains(r, "No accounts were closed.")
        for u in (self.rich, other_super, self.admin):
            u.refresh_from_db()
            self.assertTrue(u.is_active)


@override_settings(SECURE_SSL_REDIRECT=False)
class RiderClosedTests(TestCase):
    def test_closing_a_rider_takes_them_offline_and_suspends(self):
        from apps.deliveries.models import RiderProfile
        from apps.accounts.deletion import delete_account
        u = User.objects.create_user(email="rider@oam.test", password="x-Pass-12345")
        r = RiderProfile.objects.create(user=u, full_name="Rider", phone="0800000000", vehicle_type="motorcycle",
                                        verification_status="approved", availability="online")
        with self.assertNoLogs("accounts", level="ERROR"):
            delete_account(u)
        r.refresh_from_db()
        self.assertEqual(r.availability, RiderProfile.Availability.OFFLINE)
        self.assertEqual(r.verification_status, RiderProfile.Verification.SUSPENDED)
