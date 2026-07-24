"""
How much money is actually YOURS?

THE PROBLEM THIS SOLVES
  Paystack settles everything it collects into your bank account — customer
  wallet funding and your margin arrive together, indistinguishable. But they
  are completely different kinds of money:

    * A customer funds ₦1,000. That cash is now in your bank, but in your
      ledger it is a LIABILITY: money you owe them, withdrawable at any moment.
      It is not income and never was.

    * You sell ₦1,000 of electricity that costs you ₦990. The ₦10 margin is
      genuinely yours.

  Spend the first kind and you have a shortfall the day customers withdraw.
  This command tells you the difference before you move anything.

USAGE
    python3 manage.py float_check
    python3 manage.py float_check --currency NGN
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum

from datetime import timedelta

from django.utils import timezone

from apps.billing.models import BillOrder
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService


class Command(BaseCommand):
    help = "Show customer liabilities vs. earnings, and what is safe to take out."

    def add_arguments(self, parser):
        parser.add_argument("--currency", default="NGN")
        parser.add_argument("--days", type=int, default=30,
                            help="Window for the provider-cost estimate (default 30).")
        parser.add_argument("--reserve", type=float, default=0,
                            help="Extra operating buffer to hold back.")

    def handle(self, *args, **opts):
        cur = opts["currency"].upper()

        qs = Wallet.objects.filter(currency=cur).select_related("user")

        # Operator wallets are not customer liabilities. Swept earnings land in
        # a staff wallet, so counting those as "owed to customers" would inflate
        # the float you think you must hold — and understate what's yours.
        staff = qs.filter(user__is_staff=True)
        customers = qs.exclude(user__is_staff=True)

        owed = customers.aggregate(s=Sum("cached_balance"))["s"] or 0
        operator = staff.aggregate(s=Sum("cached_balance"))["s"] or 0

        try:
            earnings = WalletService.revenue_balance(cur)
        except Exception:                                   # noqa: BLE001
            earnings = 0

        wallets = customers.exclude(cached_balance=0).count()

        # What your provider float costs to run. Selling ₦1,000 of electricity
        # consumes ₦990 at vtu.ng, and that has to be replaced to keep selling.
        # It arrives in the same settlement as your margin, so treating it as
        # profit leaves you unable to restock.
        since = timezone.now() - timedelta(days=opts["days"])
        recent = BillOrder.objects.filter(
            created_at__gte=since, status="success", currency=cur,
        )
        provider_cost = sum(float(o.cost_amount or 0) for o in recent)
        sold = sum(float(o.amount or 0) for o in recent)
        reserve = float(opts["reserve"] or 0)

        w = self.stdout.write
        w("")
        w(f"  {cur} POSITION")
        w("  " + "-" * 52)
        w(f"  Owed to customers      {owed:>14,.2f}   ({wallets} funded wallet(s))")
        w(f"  Unswept earnings       {earnings:>14,.2f}")
        w(f"  In operator wallets    {operator:>14,.2f}   (staff/admin, incl. swept earnings)")
        w("  " + "-" * 52)
        yours = float(earnings) + float(operator)
        takeable = max(0.0, yours - reserve)

        w("")
        w(f"  Last {opts['days']} days: sold {sold:,.2f}, cost {provider_cost:,.2f} at your provider")
        w("  " + "-" * 52)
        w(self.style.WARNING(
            f"  Keep available         {owed:>14,.2f}   for customer withdrawals"))
        w(f"  Keep for provider float{provider_cost:>14,.2f}   to keep selling at this rate")
        if reserve:
            w(f"  Operating reserve      {reserve:>14,.2f}")
        w(self.style.SUCCESS(
            f"  Yours to take out      {takeable:>14,.2f}"))
        w("")
        w("  Every customer can withdraw their balance at any time, so the amount")
        w("  above must stay reachable — in your Paystack balance, your bank, or")
        w("  split between them.")
        w("")
        w("  'Yours' = unswept earnings plus whatever already sits in operator")
        w("  wallets. Sweeping earnings moves them from one line to the other; it")
        w("  doesn't change how much is yours, and it never touches customer money.")
        w("")
        w("  The provider-float line is NOT a liability — it's working capital. It")
        w("  settles to you alongside your margin, so taking it out as profit")
        w("  leaves you unable to restock at vtu.ng and deliveries start failing.")
        w("")

        if owed > 0:
            w(self.style.NOTICE(
                "  Reminder: your Paystack TRANSFER balance is what funds customer\n"
                "  withdrawals. If auto-settlement sweeps it to your bank, withdrawals\n"
                "  fail with 'Not enough money' even though the money exists.\n"))
