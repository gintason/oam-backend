"""O.A.M admin accounts share one company wallet."""
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.wallet.models import Wallet
from apps.wallet.services import WalletService, wallet_owner

OWNER, DEV = "oammotors@gmail.com", "gintason@gmail.com"


@override_settings(SECURE_SSL_REDIRECT=False, COMPANY_WALLET_OWNER=OWNER,
                   COMPANY_WALLET_SHARED_WITH=[OWNER, DEV])
class CompanyWalletTests(TestCase):
    def setUp(self):
        U = get_user_model()
        mk = lambda e, staff: U.objects.create_user(email=e, password="x-Pass-12345", is_verified=True, is_staff=staff)
        self.owner, self.dev = mk(OWNER, True), mk(DEV, True)
        self.support = mk("support@oam.test", True)       # staff, but not on the shared list
        self.customer = mk("c@oam.test", False)

    def api(self, u):
        c = APIClient(); c.force_authenticate(u); return c

    def test_both_admins_get_the_same_wallet(self):
        a = WalletService.get_or_create_wallet(self.owner, "NGN")
        b = WalletService.get_or_create_wallet(self.dev, "NGN")
        self.assertEqual(a.pk, b.pk)
        self.assertEqual(a.user, self.owner)

    def test_others_keep_their_own_wallet(self):
        mine = WalletService.get_or_create_wallet(self.customer, "NGN")
        self.assertEqual(mine.user, self.customer)
        self.assertEqual(wallet_owner(self.support), self.support)

    def test_sweep_by_either_admin_shows_for_both(self):
        WalletService.credit(WalletService.get_or_create_wallet(self.customer, "NGN"), Decimal("1000"))
        # put ₦500 of revenue on the books, then sweep it as the developer admin
        from apps.wallet.models import LedgerAccount, LedgerPosting
        from apps.wallet.services import REVENUE_ACCOUNT
        rev = WalletService.system_account(REVENUE_ACCOUNT, "NGN", LedgerAccount.Type.LIABILITY)
        cash = WalletService.system_account("cash:clearing", "NGN", LedgerAccount.Type.ASSET)
        WalletService.post(currency="NGN", description="rev", lines=[(cash, LedgerPosting.Direction.DEBIT, Decimal("500")),
                                                                      (rev, LedgerPosting.Direction.CREDIT, Decimal("500"))])
        r = self.api(self.dev).post("/api/v1/billing/revenue/sweep/", {"currency": "NGN", "amount": "500"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        for u in (self.dev, self.owner):
            rows = self.api(u).get("/api/v1/wallet/").json()["wallets"]
            ngn = next(w for w in rows if w["currency"] == "NGN")
            self.assertEqual(Decimal(ngn["balance"]), Decimal("500"))
            tx = self.api(u).get("/api/v1/wallet/NGN/transactions/").json()
            self.assertTrue((tx.get("results") if isinstance(tx, dict) else tx))

    def test_merge_command_moves_old_personal_balance(self):
        # an old personal wallet created before sharing was switched on
        from apps.wallet.models import LedgerAccount
        acct = LedgerAccount.objects.create(code=f"wallet:{self.dev.id}:NGN", name="old", type=LedgerAccount.Type.LIABILITY,
                                            currency="NGN", owner=self.dev, is_system=False)
        old = Wallet.objects.create(user=self.dev, currency="NGN", account=acct)
        WalletService.credit(old, Decimal("500"))
        out = StringIO(); call_command("merge_company_wallets", stdout=out)
        self.assertIn("Dry run", out.getvalue())
        old.refresh_from_db(); self.assertEqual(old.cached_balance, Decimal("500"))
        call_command("merge_company_wallets", "--apply", stdout=StringIO())
        call_command("merge_company_wallets", "--apply", stdout=StringIO())      # safe to re-run
        old.refresh_from_db()
        company = Wallet.objects.get(user=self.owner, currency="NGN")
        self.assertEqual((old.cached_balance, company.cached_balance), (Decimal("0"), Decimal("500")))
        self.assertEqual(WalletService.derived_balance(company), Decimal("500"))

    def test_admins_cannot_transfer_to_each_other(self):
        from apps.wallet.transfer import TransferError, TransferService
        WalletService.credit(WalletService.get_or_create_wallet(self.owner, "NGN"), Decimal("1000"))
        with self.assertRaises(TransferError):
            TransferService.send(sender=self.dev, identifier=OWNER, amount=Decimal("100"))
