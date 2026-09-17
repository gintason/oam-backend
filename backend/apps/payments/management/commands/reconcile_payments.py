"""
Reconcile card payments that were charged on the gateway (Flutterwave/Paystack)
but never settled locally — e.g. the webhook was missed and the customer closed
the app before the in-app verify ran. For each stuck transaction this re-verifies
against the gateway and settles it: a successful charge credits the customer's
wallet (which then attempts the service and refunds to wallet on failure), a
failed/abandoned charge is marked failed. settle() is idempotent, so this is safe
to run repeatedly and safe to run alongside webhooks.

Examples:
    python manage.py reconcile_payments                 # settle pending/processing older than 3 min
    python manage.py reconcile_payments --minutes 10    # only those older than 10 minutes
    python manage.py reconcile_payments --provider flutterwave
    python manage.py reconcile_payments --dry-run       # list what WOULD be settled, change nothing
    python manage.py reconcile_payments --limit 100
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments.models import ServiceTransaction
from apps.payments.services import FundingService

UNSETTLED = [ServiceTransaction.Status.PENDING, ServiceTransaction.Status.PROCESSING]


class Command(BaseCommand):
    help = "Settle card payments charged on the gateway but not settled locally (missed webhooks)."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=3,
                            help="Only reconcile transactions older than this many minutes (default 3), "
                                 "to avoid racing in-flight payments.")
        parser.add_argument("--provider", type=str, default="",
                            help="Limit to one provider, e.g. flutterwave or paystack.")
        parser.add_argument("--limit", type=int, default=200, help="Max transactions to process (default 200).")
        parser.add_argument("--dry-run", action="store_true", help="List candidates without settling.")

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(minutes=opts["minutes"])
        qs = (ServiceTransaction.objects
              .filter(status__in=UNSETTLED, created_at__lte=cutoff)
              .order_by("created_at"))
        if opts["provider"]:
            qs = qs.filter(provider=opts["provider"])
        qs = qs[: opts["limit"]]

        total = qs.count()
        if total == 0:
            self.stdout.write("Nothing to reconcile.")
            return

        self.stdout.write(f"{'[DRY RUN] ' if opts['dry_run'] else ''}Reconciling {total} unsettled payment(s) "
                          f"older than {opts['minutes']} min:")

        settled = failed = errored = unchanged = 0
        for txn in qs:
            ref = txn.internal_reference
            label = f"  {ref}  {txn.amount} {txn.currency}  [{txn.provider}]  was {txn.status}"
            if opts["dry_run"]:
                self.stdout.write(label + "  -> would verify")
                continue
            try:
                FundingService.settle(ref)          # verifies with the gateway; idempotent
                txn.refresh_from_db()
                if txn.status == ServiceTransaction.Status.SUCCESS:
                    settled += 1; self.stdout.write(self.style.SUCCESS(label + "  -> SUCCESS (wallet credited)"))
                elif txn.status == ServiceTransaction.Status.FAILED:
                    failed += 1; self.stdout.write(label + "  -> failed at gateway (no charge / not paid)")
                else:
                    unchanged += 1; self.stdout.write(label + f"  -> still {txn.status} (gateway not final yet)")
            except Exception as exc:  # noqa: BLE001 — never let one bad txn stop the batch
                errored += 1
                self.stdout.write(self.style.WARNING(label + f"  -> ERROR: {str(exc)[:120]}"))

        if not opts["dry_run"]:
            self.stdout.write(self.style.SUCCESS(
                f"Done. settled={settled} failed={failed} still-pending={unchanged} errors={errored}."))
