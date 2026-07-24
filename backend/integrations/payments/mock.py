"""
DEV-ONLY mock payment gateway. Select it with DEFAULT_PROVIDER_PAYMENTS=mock to
test the funding + ledger flow without real Paystack keys. initialize returns a
fake authorization URL; settlement is driven by the dev simulate endpoint.
"""
from __future__ import annotations

from decimal import Decimal

from integrations.base import register
from integrations.base.dto import ChargeInit, ChargeStatus, TxnStatus
from integrations.base.interfaces import PaymentGateway


@register("payments", "mock")
class MockGateway(PaymentGateway):
    base_url = "https://mock.local"

    def initialize_charge(self, *, amount, currency, email, reference, metadata=None):
        return ChargeInit(
            authorization_url=f"https://mock.local/pay/{reference}",
            access_code="mock-access-code",
            provider_reference=reference,
            raw={"mock": True, "amount": str(amount), "currency": currency},
        )

    def verify_charge(self, reference):
        # In mock mode we treat any verify as success (dev convenience).
        return ChargeStatus(status=TxnStatus.SUCCESS, amount=Decimal("0"),
                            currency="", provider_reference=reference, raw={"mock": True})

    def verify_webhook(self, payload, headers):
        return True
