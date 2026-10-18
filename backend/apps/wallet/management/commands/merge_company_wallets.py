"""
python manage.py merge_company_wallets           # show what would move
python manage.py merge_company_wallets --apply   # move it

Moves any money sitting in the personal wallets of the accounts listed in
COMPANY_WALLET_SHARED_WITH into the shared company wallet (owned by
COMPANY_WALLET_OWNER). Run once after enabling the shared company wallet.
Each move is a balanced ledger entry and safe to re-run.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.wallet.models import LedgerPosting, Wallet
from apps.wallet.services import WalletService


class Command(BaseCommand):
    help = "Move admins' personal wallet balances into the shared O.A.M company wallet."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **opts):
        User = get_user_model()
        owner_email = (settings.COMPANY_WALLET_OWNER or "").strip()
        owner = User.objects.filter(email__iexact=owner_email, is_active=True).first() if owner_email else None
        if owner is None:
            self.stderr.write(f"Company wallet owner '{owner_email}' not found - nothing done.")
            return
        others = [e for e in settings.COMPANY_WALLET_SHARED_WITH if e.strip().lower() != owner_email.lower()]
        moved = 0
        for email in others:
            user = User.objects.filter(email__iexact=email.strip()).first()
            if user is None:
                self.stdout.write(f"{email}: no such account")
                continue
            for w in Wallet.objects.filter(user=user, cached_balance__gt=0).select_related("account"):
                self.stdout.write(f"{email}: {w.currency} {w.cached_balance:,.2f} -> company wallet ({owner_email})")
                if not opts["apply"]:
                    continue
                with transaction.atomic():
                    src = Wallet.objects.select_for_update().select_related("account").get(pk=w.pk)
                    dest = WalletService.get_or_create_wallet(owner, src.currency)
                    dest = Wallet.objects.select_for_update().select_related("account").get(pk=dest.pk)
                    amount = src.cached_balance
                    if amount <= 0:
                        continue
                    WalletService.post(
                        currency=src.currency,
                        description=f"Moved to O.A.M company wallet from {email}",
                        lines=[(src.account, LedgerPosting.Direction.DEBIT, amount),
                               (dest.account, LedgerPosting.Direction.CREDIT, amount)],
                        idempotency_key=f"company-merge:{src.pk}:{src.version}",
                    )
                    src.cached_balance -= amount; src.version += 1
                    src.save(update_fields=["cached_balance", "version", "updated_at"])
                    dest.cached_balance += amount; dest.version += 1
                    dest.save(update_fields=["cached_balance", "version", "updated_at"])
                    moved += 1
        if opts["apply"]:
            self.stdout.write(self.style.SUCCESS(f"Done - {moved} balance(s) moved."))
        else:
            self.stdout.write("Dry run. Re-run with --apply to move the money.")
