"""
A throwaway demo proving the ledger works end-to-end, WITHOUT any API yet.

Run:  python manage.py wallet_demo --email you@example.com --currency NGN

It will: get/create a wallet, credit it, debit it, try an overdraft (which
should be blocked), then print the cached balance, the derived balance (from
the immutable postings), and the posting history.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.wallet.exceptions import InsufficientFunds
from apps.wallet.models import LedgerPosting
from apps.wallet.services import WalletService

User = get_user_model()


class Command(BaseCommand):
    help = "Demonstrates the double-entry wallet ledger."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--currency", default="NGN")

    def handle(self, *args, **opts):
        user = User.objects.filter(email__iexact=opts["email"]).first()
        if not user:
            raise CommandError(f"No user with email {opts['email']}")
        currency = opts["currency"].upper()

        wallet = WalletService.get_or_create_wallet(user, currency)
        self.stdout.write(self.style.SUCCESS(f"Wallet ready: {wallet}"))

        WalletService.credit(wallet, Decimal("50000"), description="Demo top-up")
        self.stdout.write("Credited 50,000")

        WalletService.debit(wallet, Decimal("12000"), description="Demo spend")
        self.stdout.write("Debited 12,000")

        # This should be BLOCKED (no overdraft).
        try:
            WalletService.debit(wallet, Decimal("100000"), description="Overdraft attempt")
            self.stdout.write(self.style.ERROR("Overdraft was NOT blocked — bug!"))
        except InsufficientFunds as exc:
            self.stdout.write(self.style.SUCCESS(f"Overdraft correctly blocked: {exc}"))

        wallet.refresh_from_db()
        cached = wallet.cached_balance
        derived = WalletService.derived_balance(wallet)
        self.stdout.write(f"\nCached balance : {cached} {currency}")
        self.stdout.write(f"Derived balance: {derived} {currency}")
        match = "MATCH ✅" if cached == derived else "MISMATCH ❌"
        self.stdout.write(self.style.SUCCESS(f"Reconciliation : {match}"))

        self.stdout.write("\nPostings on this wallet's account:")
        for p in LedgerPosting.objects.filter(account=wallet.account).order_by("created_at"):
            self.stdout.write(f"  {p.created_at:%H:%M:%S}  {p.direction:<6} {p.amount} {p.currency}")
