"""
python manage.py process_withdrawal_queue            # send what the balance allows
python manage.py process_withdrawal_queue --status   # just show what's waiting

Run every 10 minutes (Render Cron Job) so queued withdrawals go out soon after
the Paystack balance is topped up. Safe to run alongside the admin "Retry now"
and the API trigger: each withdrawal is locked while it is sent.
"""
from django.core.management.base import BaseCommand

from apps.payouts.services import WithdrawalService, alert_ops_if_needed


class Command(BaseCommand):
    help = "Retry queued withdrawals (oldest first) while the transfer balance allows."

    def add_arguments(self, parser):
        parser.add_argument("--status", action="store_true", help="Only print the queue summary.")
        parser.add_argument("--currency", default="NGN")

    def handle(self, *args, **opts):
        cur = opts["currency"].upper()
        if not opts["status"]:
            sy = WithdrawalService.sync_processing()
            if any(sy.values()):
                self.stdout.write(f"Checked with Paystack: completed {sy['completed']} · refunded "
                                  f"{sy['refunded']} · waiting for OTP {sy['awaiting_otp']}")
        s = WithdrawalService.queue_summary(cur)
        bal = "unknown" if s["balance"] is None else f"{s['balance']:,.2f}"
        self.stdout.write(f"Queued: {s['count']} · total {cur} {s['total']:,.2f} · balance {bal}"
                          + (f" · shortfall {s['shortfall']:,.2f}" if s["shortfall"] else ""))
        if opts["status"] or not s["count"]:
            return
        st = WithdrawalService.process_queue(currency=cur)
        self.stdout.write(self.style.SUCCESS(
            f"Sent {st['sent']} · still waiting {st['still_queued']} · failed {st['failed']} · "
            f"refunded (overdue) {st['refunded_overdue']}"))
        if st["still_queued"]:
            alert_ops_if_needed(cur)
