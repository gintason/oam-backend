#!/usr/bin/env python3
"""
Add Betting Wallet Funding on top of the existing vtu.ng / billing system.

Users fund a betting account (Bet9ja, SportyBet, BetKing, …) from their OAM
wallet. They pay `amount + ₦50` — the betting account is credited with `amount`
and OAM keeps the flat ₦50 as revenue (in place of vtu.ng's reseller discount).

Reuses everything already in place: the vtu.ng adapter + auth, the wallet
hold/settle flow, BillOrder, verify-customer, the requery/webhook settlement, and
the revenue ledger. No new provider credentials.

WHAT IT DOES (guarded; aborts if a file diverged):
  1. vtu adapter: adds a "betting" branch -> POST /api/v2/betting
     {request_id, customer_id, service_id, amount}.
  2. billing service: BillingService.purchase_betting() (min ₦100, max ₦100,000,
     ₦50 fee) + execute() now sends the betting amount (not amount+fee) to vtu.ng.
  3. billing views: verify-customer now accepts category "betting"; new
     BettingFundView.
  4. billing urls: POST /api/v1/billing/betting/fund/.
  5. management command: seed_betting_billers (the 14 providers).

Betting uses the category string "betting" (Biller/BillOrder.category are plain
CharFields), so NO migration is required.

RUN FROM THE BACKEND ROOT:
    python3 betting_patch/apply_betting.py
    python manage.py seed_betting_billers        # once, seeds the 14 providers
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


def edit(path, subs):
    full = _p(path)
    if not os.path.exists(full):
        sys.exit(f"ABORT: expected file not found: {path}")
    s = open(full, encoding="utf-8").read()
    for old, new in subs:
        if new in s:
            print(f"  = {path}: already applied, skipping one edit")
            continue
        if s.count(old) != 1:
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:200]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


# --------------------------------------------------------- 1. adapter branch
edit("integrations/vtu/vtung/adapter.py", [(
    '        else:\n'
    '            # data / electricity / cable arrive in later chunks\n'
    '            raise ProviderValidationError("vtung", f"service \'{req.service}\' not integrated yet")',
    '        elif req.service == "betting":\n'
    '            # service_id is the exact provider name (e.g. "Bet9ja"); amount is the\n'
    '            # betting credit (the OAM fee is kept in the wallet layer, not sent here).\n'
    '            payload = {"request_id": request_id, "customer_id": req.recipient,\n'
    '                       "service_id": req.operator, "amount": int(req.amount)}\n'
    '            resp = self._post("/api/v2/betting", payload)\n'
    '        else:\n'
    '            # data / electricity / cable arrive in later chunks\n'
    '            raise ProviderValidationError("vtung", f"service \'{req.service}\' not integrated yet")',
)])

# --------------------------------------------------------- 2. service
edit("apps/billing/services.py", [
    # execute(): send the betting amount (not amount+fee) to the provider
    (
        '            result = provider.purchase(VTURequest(\n'
        '                service=order.category, operator=order.biller.code,\n'
        '                recipient=order.recipient, amount=order.amount,\n'
        '                plan_code=order.plan_code, request_id=order.reference,\n'
        '            ))',
        '            provider_amount = order.amount\n'
        '            if order.category == "betting":\n'
        '                provider_amount = Decimal(str((order.metadata or {}).get("betting_amount") or order.amount))\n'
        '            result = provider.purchase(VTURequest(\n'
        '                service=order.category, operator=order.biller.code,\n'
        '                recipient=order.recipient, amount=provider_amount,\n'
        '                plan_code=order.plan_code, request_id=order.reference,\n'
        '            ))',
    ),
    # add purchase_betting() before the generic purchase() dispatcher
    (
        '    @staticmethod\n'
        '    def purchase(**kwargs) -> BillOrder:\n'
        '        return BillingService.execute(BillingService.create_and_hold(**kwargs))',
        '    @staticmethod\n'
        '    def purchase_betting(*, user, code, customer_id, amount, verification_id,\n'
        '                         currency="NGN") -> BillOrder:\n'
        '        """Fund a betting account. The user pays amount + a flat ₦50 OAM service\n'
        '        fee; the betting account is credited with `amount`."""\n'
        '        biller = BillingService._resolve_biller("NG", "betting", code)\n'
        '        cv = BillingService._require_verification(user, biller.code, customer_id, verification_id)\n'
        '        try:\n'
        '            amount = Decimal(str(amount).replace(",", ""))\n'
        '        except Exception:\n'
        '            raise BillingError("Invalid amount.")\n'
        '        if amount < Decimal("100"):\n'
        '            raise BillingError("Minimum funding is ₦100.")\n'
        '        if amount > Decimal("100000"):\n'
        '            raise BillingError("Maximum funding is ₦100,000.")\n'
        '        fee = Decimal("50")\n'
        '        total = amount + fee\n'
        '        order = BillingService.create_and_hold(\n'
        '            user=user, country="NG", category="betting", code=code,\n'
        '            recipient=str(customer_id), amount=total, currency=currency,\n'
        '        )\n'
        '        order.cost_amount = amount\n'
        '        order.revenue_amount = fee\n'
        '        order.customer_name = cv.customer_name\n'
        '        md = dict(order.metadata or {})\n'
        '        md.update({"betting_amount": str(amount), "fee": str(fee), "service_id": biller.code})\n'
        '        order.metadata = md\n'
        '        order.save(update_fields=["cost_amount", "revenue_amount", "customer_name",\n'
        '                                  "metadata", "updated_at"])\n'
        '        return BillingService.execute(order)\n'
        '\n'
        '    @staticmethod\n'
        '    def purchase(**kwargs) -> BillOrder:\n'
        '        return BillingService.execute(BillingService.create_and_hold(**kwargs))',
    ),
])

# --------------------------------------------------------- 3. views
edit("apps/billing/views.py", [
    # allow betting in verify-customer
    (
        '        if category not in ("cable", "electricity") or not code or not customer_id:\n'
        '            return Response({"detail": "category (cable/electricity), code and customer_id are required."},\n'
        '                            status=status.HTTP_400_BAD_REQUEST)',
        '        if category not in ("cable", "electricity", "betting") or not code or not customer_id:\n'
        '            return Response({"detail": "category (cable/electricity/betting), code and customer_id are required."},\n'
        '                            status=status.HTTP_400_BAD_REQUEST)',
    ),
    # add BettingFundView before DataPlansView
    (
        'class DataPlansView(APIView):',
        'class BettingFundView(APIView):\n'
        '    """POST /billing/betting/fund/ {code, customer_id, amount, verification_id}.\n'
        '    User pays amount + ₦50; the betting account is credited with amount."""\n'
        '    permission_classes = [IsAuthenticated, IsVerified]\n'
        '\n'
        '    def post(self, request):\n'
        '        d = request.data\n'
        '        code = d.get("code") or d.get("service_id")\n'
        '        customer_id = d.get("customer_id") or d.get("recipient")\n'
        '        amount = d.get("amount")\n'
        '        verification_id = d.get("verification_id")\n'
        '        if not code or not customer_id or amount in (None, "") or not verification_id:\n'
        '            return Response({"detail": "code, customer_id, amount and verification_id are required."},\n'
        '                            status=status.HTTP_400_BAD_REQUEST)\n'
        '        try:\n'
        '            order = BillingService.purchase_betting(\n'
        '                user=request.user, code=code, customer_id=customer_id,\n'
        '                amount=amount, verification_id=verification_id,\n'
        '                currency=d.get("currency", "NGN"),\n'
        '            )\n'
        '        except InsufficientFunds as exc:\n'
        '            return Response({"detail": str(exc), "reason": "insufficient_funds"},\n'
        '                            status=status.HTTP_402_PAYMENT_REQUIRED)\n'
        '        except BillingError as exc:\n'
        '            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)\n'
        '        http = status.HTTP_201_CREATED if order.status == BillOrder.Status.SUCCESS \\\n'
        '            else status.HTTP_200_OK\n'
        '        return Response(BillOrderSerializer(order).data, status=http)\n'
        '\n'
        '\n'
        'class DataPlansView(APIView):',
    ),
])

# --------------------------------------------------------- 4. urls
edit("apps/billing/urls.py", [
    (
        'from .views import (\n    BillerListView,',
        'from .views import (\n    BettingFundView,\n    BillerListView,',
    ),
    (
        '    path("verify-customer/", VerifyCustomerView.as_view(), name="verify-customer"),',
        '    path("verify-customer/", VerifyCustomerView.as_view(), name="verify-customer"),\n'
        '    path("betting/fund/", BettingFundView.as_view(), name="betting-fund"),',
    ),
])

# --------------------------------------------------- 5. seed command
SEED = '''from django.core.management.base import BaseCommand

from apps.billing.models import Biller

# vtu.ng betting providers (service_id == provider name, case-sensitive).
PROVIDERS = [
    "1xBet", "BangBet", "Bet9ja", "BetKing", "BetLand", "BetLion", "BetWay",
    "CloudBet", "LiveScoreBet", "MerryBet", "NaijaBet", "NairaBet",
    "SportyBet", "SupaBet",
]


class Command(BaseCommand):
    help = "Seed the Nigerian betting providers as billers (category=betting)."

    def handle(self, *args, **options):
        created = 0
        for name in PROVIDERS:
            _, was_created = Biller.objects.get_or_create(
                country="NG", category="betting", code=name,
                defaults={"name": name, "is_active": True},
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Betting billers ready ({created} created, {len(PROVIDERS)} total)."))
'''
cmd_dir = _p("apps", "billing", "management", "commands")
os.makedirs(cmd_dir, exist_ok=True)
open(os.path.join(cmd_dir, "seed_betting_billers.py"), "w", encoding="utf-8").write(SEED)
print("  + wrote apps/billing/management/commands/seed_betting_billers.py")

print("\nDONE. Betting funding added. Now run:  python manage.py seed_betting_billers")
