"""
Reconcile card payments charged on the gateway (Flutterwave/Paystack) but not
finalised locally — missed webhooks, app closed before the in-app verify, or
records stuck in a legacy/non-standard status.

For each such transaction it re-verifies against the gateway and settles it:
a confirmed-paid charge credits the customer's wallet (which then attempts the
service and refunds to wallet on failure); an unpaid/failed charge is left/marked
accordingly. settle() is idempotent (keyed on the reference), so this is safe to
run repeatedly and safe alongside webhooks — a wallet can never be double-credited.

Targeting: everything whose status is NOT a final state (success / failed /
reversed). That deliberately includes `pending`, `processing`, AND any legacy or
unexpected status such as `completed`, so nothing can slip through.

Examples:
    python manage.py reconcile_payments                 # non-final txns older than 3 min
    python manage.py reconcile_payments --minutes 10
    python manage.py reconcile_payments --provider flutterwave
    python manage.py reconcile_payments --include-failed # also re-check 'failed' (late settlers)
    python manage.py reconcile_payments --dry-run
    python manage.py reconcile_payments --limit 100
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments.models import ServiceTransaction
from apps.payments.services import FundingService

S = ServiceTransaction.Status
# Final states we must NEVER re-process (money already accounted / intentionally reversed).
FINAL = [S.SUCCESS, S.FAILED, S.REVERSED]
FINAL_KEEP_FAILED = [S.SUCCESS, S.REVERSED]   # when --include-failed, don't treat FAILED as final


class Command(BaseCommand):
    help = "Settle gateway-charged payments not finalised locally (missed webhooks / legacy statuses)."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=3,
                            help="Only reconcile transactions older than this many minutes (default 3).")
        parser.add_argument("--provider", type=str, default="", help="Limit to one provider (flutterwave/paystack).")
        parser.add_argument("--limit", type=int, default=300, help="Max transactions to process (default 300).")
        parser.add_argument("--include-failed", action="store_true",
                            help="Also re-verify 'failed' txns (in case a payment settled late).")
        parser.add_argument("--dry-run", action="store_true", help="List candidates without settling.")

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(minutes=opts["minutes"])
        final = FINAL_KEEP_FAILED if opts["include_failed"] else FINAL
        qs = (ServiceTransaction.objects
              .exclude(status__in=final)              # everything non-final: pending/processing/completed/legacy
              .filter(created_at__lte=cutoff)
              .order_by("created_at"))
        if opts["provider"]:
            qs = qs.filter(provider=opts["provider"])
        qs = qs[: opts["limit"]]

        total = qs.count()
        if total == 0:
            self.stdout.write("Nothing to reconcile.")
            return

        self.stdout.write(f"{'[DRY RUN] ' if opts['dry_run'] else ''}Reconciling {total} non-final payment(s) "
                          f"older than {opts['minutes']} min:")

        settled = failed = errored = unchanged = 0
        for txn in qs:
            ref = txn.internal_reference
            label = f"  {ref}  {txn.amount} {txn.currency}  [{txn.provider}]  was {txn.status}"
            if opts["dry_run"]:
                self.stdout.write(label + "  -> would verify")
                continue
            try:
                FundingService.settle(ref)          # verifies with the gateway; idempotent credit
                txn.refresh_from_db()
                if txn.status == S.SUCCESS:
                    settled += 1; self.stdout.write(self.style.SUCCESS(label + "  -> SUCCESS (wallet credited)"))
                elif txn.status == S.FAILED:
                    failed += 1; self.stdout.write(label + "  -> failed at gateway (no charge / not paid)")
                else:
                    unchanged += 1; self.stdout.write(label + f"  -> still {txn.status} (gateway not final / mismatch)")
            except Exception as exc:  # noqa: BLE001 — one bad txn must not stop the batch
                errored += 1
                self.stdout.write(self.style.WARNING(label + f"  -> ERROR: {str(exc)[:140]}"))

        if not opts["dry_run"]:
            self.stdout.write(self.style.SUCCESS(
                f"Done. settled={settled} failed={failed} still-pending={unchanged} errors={errored}."))
