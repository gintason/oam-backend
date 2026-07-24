"""
Reset all TEST money data so the platform starts from a clean, truthful ledger.

WHY A RESET AND NOT AN ADJUSTMENT
  Your wallet's balance was built almost entirely from test funding (₦30,500)
  that never existed at Paystack, and part of it was spent on real VTU
  purchases. There is no set of correcting entries that makes that history
  "true" — the cleanest and most honest option before launch is to clear the
  test data entirely and begin with a ledger that only ever contains real money.

WHAT IT DELETES
  • all ledger postings + journal entries      (the double-entry history)
  • all bill orders + card checkouts           (test purchases)
  • all withdrawal orders                      (test payouts)
  • all funding/service transactions           (test top-ups)
  • all wallet transfers, if that app is installed
  • resets every wallet's cached_balance to 0

WHAT IT KEEPS
  • user accounts (you stay logged in, still verified, still admin)
  • saved bank accounts
  • billers / service categories / marketplace / artisan data
  • your Paystack + provider configuration

SAFETY
  • Dry run by default — shows counts and changes NOTHING.
  • Requires  --confirm  to actually delete.
  • Refuses to run if DEBUG is False (i.e. looks like production) unless you
    also pass --force, so this can never be casually run against live data.

USAGE
    python3 reset_test_money.py              # dry run, shows what would go
    python3 reset_test_money.py --confirm    # actually reset
"""
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings  # noqa: E402
from django.db import transaction  # noqa: E402

CONFIRM = "--confirm" in sys.argv
FORCE = "--force" in sys.argv


def model(path, name):
    """
    Import a model if its app is installed AND its table exists.

    A model class can import fine while its migration hasn't been run yet
    (e.g. transfer.py copied in but not migrated), so we check the table too
    and simply skip anything that isn't there.
    """
    try:
        mod = __import__(path, fromlist=[name])
        klass = getattr(mod, name)
    except Exception:
        return None

    from django.db import connection

    table = klass._meta.db_table
    if table not in connection.introspection.table_names():
        print(f"  (skipping {name}: table '{table}' does not exist yet)")
        return None
    return klass


def main():
    if not settings.DEBUG and not FORCE:
        sys.exit(
            "Refusing to run: DEBUG is False, which looks like production.\n"
            "If you are certain, re-run with --force."
        )

    from apps.wallet.models import Wallet, LedgerPosting, JournalEntry

    targets = []

    def add(label, qs):
        if qs is not None:
            targets.append((label, qs))

    add("ledger postings", LedgerPosting.objects.all())
    add("journal entries", JournalEntry.objects.all())

    BillOrder = model("apps.billing.models", "BillOrder")
    add("bill orders", BillOrder.objects.all() if BillOrder else None)

    CardCheckout = model("apps.billing.card", "CardCheckout")
    add("card checkouts", CardCheckout.objects.all() if CardCheckout else None)

    WithdrawalOrder = model("apps.payouts.models", "WithdrawalOrder")
    add("withdrawal orders", WithdrawalOrder.objects.all() if WithdrawalOrder else None)

    ServiceTransaction = model("apps.payments.models", "ServiceTransaction")
    add("funding transactions", ServiceTransaction.objects.all() if ServiceTransaction else None)

    WalletTransfer = model("apps.wallet.transfer", "WalletTransfer")
    add("wallet transfers", WalletTransfer.objects.all() if WalletTransfer else None)

    print("\n=== TEST DATA RESET ===\n")
    total = 0
    for label, qs in targets:
        try:
            n = qs.count()
        except Exception as exc:
            print(f"  {label:24s}  skipped ({exc.__class__.__name__})")
            continue
        total += n
        print(f"  {label:24s} {n:>6}")

    wallets = Wallet.objects.all()
    print(f"  {'wallets to zero':24s} {wallets.count():>6}")
    print(f"\n  total rows to delete: {total}")

    if not CONFIRM:
        print("\nDRY RUN — nothing was changed.")
        print("Re-run with --confirm to actually reset:\n")
        print("    python3 reset_test_money.py --confirm\n")
        return

    print("\nDeleting…")
    with transaction.atomic():
        # Delete children before parents to avoid FK problems.
        for label, qs in targets:
            try:
                qs.delete()
                print(f"  cleared {label}")
            except Exception as exc:
                print(f"  skipped {label} ({exc.__class__.__name__})")
        updated = wallets.update(cached_balance=0)
        print(f"  zeroed {updated} wallet(s)")

    print("\n✓ Done. Your ledger is now empty and every wallet reads 0.00.")
    print("  Real money from here on will be the only money in the system.\n")


if __name__ == "__main__":
    main()
