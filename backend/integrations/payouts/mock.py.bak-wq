"""DEV mock transfers provider. Select with DEFAULT_PROVIDER_PAYOUTS=mock."""
from __future__ import annotations

import uuid

from integrations.base import register
from integrations.base.client import BaseProviderClient
from integrations.base.exceptions import ProviderValidationError


@register("payouts", "mock")
class MockPayouts(BaseProviderClient):
    provider_key = "mock"
    category = "payouts"

    def list_banks(self, currency="NGN"):
        return [{"name": "Mock Bank", "code": "999", "currency": currency},
                {"name": "Test Microfinance", "code": "998", "currency": currency}]

    def resolve_account(self, *, account_number, bank_code, currency="NGN"):
        # account numbers ending in "0000" simulate an unresolvable account
        if str(account_number).endswith("0000"):
            raise ProviderValidationError("mock", "Could not resolve account")
        return {"account_name": "MOCK ACCOUNT HOLDER", "bank_name": "Mock Bank",
                "account_number": account_number, "bank_code": bank_code}

    def create_recipient(self, *, name, account_number, bank_code, currency="NGN"):
        return f"RCP_mock_{uuid.uuid4().hex[:12]}"

    def initiate_transfer(self, *, amount, recipient_code, reference, currency="NGN", reason=""):
        # amounts whose kobo part is .99 simulate a FAILED transfer (to test refunds),
        # e.g. 100.99, 500.99 -> failed ; everything else -> success.
        from decimal import Decimal
        kobo = (Decimal(str(amount)) * 100).to_integral_value() % 100
        status = "failed" if kobo == 99 else "success"
        return {"status": status, "provider_reference": f"TRF_mock_{uuid.uuid4().hex[:12]}",
                "raw": {"mock": True, "status": status}}

    def verify_webhook(self, payload, headers):
        return True     # dev only
