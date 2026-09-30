"""
Employer plans, prices and what each plan unlocks.

Kept in one module (like apps/payments/pricing.py) so the entitlement checks,
the checkout endpoint and the web/mobile pricing screens all read the same
numbers. Prices are FIXED per currency, not live-converted.

REVENUE LEVERS
  1. Subscription plans (Free / Premium / Pro) — monthly.
  2. Pay-per-job credits — one extra active listing for a fixed period, for
     employers who hire rarely and don't want a subscription.
  3. Boosts — pin a listing to the top of search for N days.
  4. Candidate database access — Premium gets a monthly profile-view quota,
     Pro gets unlimited views and can message candidates who never applied.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal

from apps.payments.pricing import resolve_payment_currency, supported_currencies

PLAN_FREE = "free"
PLAN_PREMIUM = "premium"
PLAN_PRO = "pro"
PAID_PLANS = (PLAN_PREMIUM, PLAN_PRO)

PLAN_PERIOD_DAYS = 30
JOB_CREDIT_DAYS = 30          # how long a pay-per-job credit stays usable
BOOST_DAY_OPTIONS = (7, 30)


@dataclass(frozen=True)
class Plan:
    key: str
    label: str
    active_job_limit: int | None        # None = unlimited
    job_duration_days: int              # how long a published listing stays live
    featured_slots: int                 # listings that may be featured at once
    candidate_search: bool              # may search the candidate database
    candidate_views_per_month: int | None   # None = unlimited, 0 = none
    candidate_direct_message: bool      # may message candidates who didn't apply
    analytics: bool                     # recruitment analytics dashboard
    smart_matching: bool                # "recommended candidates" for a job
    applications_per_job: int | None    # None = unlimited (free plan caps it)

    def as_dict(self):
        return asdict(self)


PLANS: dict[str, Plan] = {
    PLAN_FREE: Plan(
        key=PLAN_FREE, label="Free",
        active_job_limit=1, job_duration_days=30, featured_slots=0,
        candidate_search=False, candidate_views_per_month=0,
        candidate_direct_message=False, analytics=False, smart_matching=False,
        applications_per_job=50,
    ),
    PLAN_PREMIUM: Plan(
        key=PLAN_PREMIUM, label="Premium",
        active_job_limit=10, job_duration_days=45, featured_slots=2,
        candidate_search=True, candidate_views_per_month=50,
        candidate_direct_message=False, analytics=True, smart_matching=True,
        applications_per_job=None,
    ),
    PLAN_PRO: Plan(
        key=PLAN_PRO, label="Pro",
        active_job_limit=None, job_duration_days=60, featured_slots=10,
        candidate_search=True, candidate_views_per_month=None,
        candidate_direct_message=True, analytics=True, smart_matching=True,
        applications_per_job=None,
    ),
}

# plan -> monthly price, per currency
PLAN_PRICES_BY_CCY = {
    "NGN": {PLAN_PREMIUM: Decimal("15000"), PLAN_PRO: Decimal("40000")},
    "USD": {PLAN_PREMIUM: Decimal("15"), PLAN_PRO: Decimal("39")},
    "GBP": {PLAN_PREMIUM: Decimal("12"), PLAN_PRO: Decimal("32")},
    "EUR": {PLAN_PREMIUM: Decimal("14"), PLAN_PRO: Decimal("36")},
}

# price of ONE pay-per-job credit, per currency
JOB_CREDIT_PRICE_BY_CCY = {
    "NGN": Decimal("5000"),
    "USD": Decimal("5"),
    "GBP": Decimal("4"),
    "EUR": Decimal("5"),
}

# boost days -> price, per currency
BOOST_PRICES_BY_CCY = {
    "NGN": {7: Decimal("3000"), 30: Decimal("9000")},
    "USD": {7: Decimal("3"), 30: Decimal("9")},
    "GBP": {7: Decimal("3"), 30: Decimal("7")},
    "EUR": {7: Decimal("3"), 30: Decimal("8")},
}


def get_plan(key: str | None) -> Plan:
    return PLANS.get(key or PLAN_FREE, PLANS[PLAN_FREE])


def _table(tables: dict, currency: str):
    return tables.get(currency, tables["NGN"])


def plan_price(plan: str, currency: str) -> Decimal:
    return _table(PLAN_PRICES_BY_CCY, currency)[plan]


def job_credit_price(currency: str) -> Decimal:
    return _table(JOB_CREDIT_PRICE_BY_CCY, currency)


def boost_price(days: int, currency: str) -> Decimal:
    return _table(BOOST_PRICES_BY_CCY, currency)[int(days)]


def pricing_payload() -> dict:
    """Everything the pricing screens need, in one public payload."""
    ccys = [c for c in supported_currencies() if c in PLAN_PRICES_BY_CCY] or ["NGN"]
    return {
        "supported_currencies": ccys,
        "period_days": PLAN_PERIOD_DAYS,
        "plans": [
            {
                **p.as_dict(),
                "prices": ({c: str(PLAN_PRICES_BY_CCY[c][p.key]) for c in ccys}
                           if p.key in PAID_PLANS else {c: "0" for c in ccys}),
            }
            for p in PLANS.values()
        ],
        "job_credit": {
            "days": JOB_CREDIT_DAYS,
            "prices": {c: str(JOB_CREDIT_PRICE_BY_CCY[c]) for c in ccys},
        },
        "boost": {
            str(d): {c: str(BOOST_PRICES_BY_CCY[c][d]) for c in ccys}
            for d in BOOST_DAY_OPTIONS
        },
    }


__all__ = [
    "PLANS", "PAID_PLANS", "PLAN_FREE", "PLAN_PREMIUM", "PLAN_PRO",
    "PLAN_PERIOD_DAYS", "JOB_CREDIT_DAYS", "BOOST_DAY_OPTIONS",
    "get_plan", "plan_price", "job_credit_price", "boost_price",
    "pricing_payload", "resolve_payment_currency",
]
