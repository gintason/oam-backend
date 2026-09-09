"""
Wallet reserve reconciliation.

Tells you, at any moment and per currency:
  * USER OBLIGATIONS  -> money that MUST stay in the reserve bank account
                         (available wallet balances + pending holds)
  * PROVIDER FLOAT    -> collected to pay providers (Reloadly/Travu/settlement);
                         keep to fund those payouts, don't spend as profit
  * OAM EARNINGS      -> accrued platform revenue that is SAFE TO SWEEP to your
                         main/operating account

Optionally pass --reserve-balance <amount> (the real balance in your reserve
bank account) to see the surplus/shortfall and a safe sweep figure.

Run (Render shell):
    python manage.py reconcile
    python manage.py reconcile --currency NGN --reserve-balance 250000
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum

from apps.wallet.models import Wallet
from apps.wallet.services import WalletService, REVENUE_ACCOUNT, HOLD_ACCOUNT

PROVIDER_CODES = ["provider:settlement", "provider:reloadly", "provider:travu"]


def _fmt(v: Decimal) -> str:
    return f"{v:,.2f}"


class Command(BaseCommand):
    help = "Reconcile user obligations (reserve floor) vs OAM earnings (safe to sweep)."

    def add_arguments(self, parser):
        parser.add_argument("--currency", default="NGN")
        parser.add_argument("--reserve-balance", default=None,
                            help="Actual balance in the reserve bank account (to compute surplus).")

    def handle(self, *args, **opts):
        ccy = opts["currency"].upper()

        def bal(code):
            return WalletService.account_balance(code, ccy)

        user_available = Wallet.objects.filter(currency=ccy).aggregate(s=Sum("cached_balance"))["s"] or Decimal("0")
        holds = bal(HOLD_ACCOUNT)
        obligations = user_available + holds

        revenue = bal(REVENUE_ACCOUNT)
        providers = {c: bal(c) for c in PROVIDER_CODES}
        provider_total = sum(providers.values(), Decimal("0"))

        w = 34
        line = "-" * 52
        out = self.stdout.write
        out(line)
        out(f"  WALLET RESERVE RECONCILIATION — {ccy}")
        out(line)
        out(f"{'User available balances':<{w}} {_fmt(user_available):>16}")
        out(f"{'Pending holds (in flight)':<{w}} {_fmt(holds):>16}")
        out(f"{'= USER OBLIGATIONS (reserve floor)':<{w}} {_fmt(obligations):>16}")
        out("")
        for c, v in providers.items():
            out(f"{'  ' + c:<{w}} {_fmt(v):>16}")
        out(f"{'= PROVIDER FLOAT (keep to pay out)':<{w}} {_fmt(provider_total):>16}")
        out("")
        out(f"{'OAM EARNINGS accrued (' + REVENUE_ACCOUNT + ')':<{w}} {_fmt(revenue):>16}")
        out(f"{'   -> SAFE TO SWEEP to main account':<{w}} {_fmt(revenue):>16}")
        out(line)

        rb = opts.get("reserve_balance")
        if rb is not None:
            try:
                reserve = Decimal(str(rb))
            except Exception:
                out("  (invalid --reserve-balance; skipping surplus check)")
                return
            surplus = reserve - obligations
            # Never sweep below what users + providers are owed.
            keep = obligations + provider_total
            safe = reserve - keep
            if safe < 0:
                safe = Decimal("0")
            sweep = min(revenue, safe)
            out(f"{'Reserve bank balance (given)':<{w}} {_fmt(reserve):>16}")
            out(f"{'Surplus over user obligations':<{w}} {_fmt(surplus):>16}")
            out(f"{'Keep in reserve (users+providers)':<{w}} {_fmt(keep):>16}")
            out(f"{'>> MAX SAFE SWEEP right now':<{w}} {_fmt(sweep):>16}")
            if reserve < obligations:
                out("")
                out("  ** WARNING: reserve is BELOW user obligations — do NOT sweep;")
                out("     top the reserve up so every user balance is covered. **")
            out(line)
