"""
Tiny integration surface for other apps. A settlement point calls
`settle_referral(...)` after finalising a transaction; we defer the actual
evaluation to transaction commit so a commission failure can never roll back
(or block) the underlying settlement.
"""
from django.db import transaction

from .signals import transaction_settled


def settle_referral(*, user, oam_profit, currency="NGN", source_reference):
    if user is None or not source_reference:
        return

    def _fire():
        transaction_settled.send(
            sender="referrals", user=user, oam_profit=oam_profit,
            currency=currency, source_reference=source_reference,
        )

    transaction.on_commit(_fire)
