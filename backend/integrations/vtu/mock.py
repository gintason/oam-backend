"""
DEV-ONLY mock VTU provider. Select with DEFAULT_PROVIDER_VTU=mock to test the
bill purchase flow (hold -> capture/release) without a real aggregator.

Test hooks:
  * recipient ending in "0000"  -> simulated FAILURE (exercises the refund path)
  * everything else             -> SUCCESS
"""
from __future__ import annotations

import uuid

from integrations.base import register
from integrations.base.dto import StatusResult, TxnStatus, VTUResult
from integrations.base.interfaces import VTUProvider


@register("vtu", "mock")
class MockVTU(VTUProvider):
    base_url = "https://mock.local"

    def purchase(self, req):
        if str(req.recipient).endswith("0000"):
            return VTUResult(status=TxnStatus.FAILED,
                             provider_reference=f"VTU-{uuid.uuid4().hex[:12]}",
                             raw={"mock": True, "reason": "simulated_failure"})
        data = {"mock": True, "customer_name": "MOCK CUSTOMER"}
        if req.service == "electricity":
            data.update({"data": {"token": "1234-5678-9012-3456", "units": "80.5",
                                  "customer_name": "MOCK CUSTOMER",
                                  "amount_charged": str(max(int(req.amount) - 15, 0))}})
        return VTUResult(status=TxnStatus.SUCCESS,
                         provider_reference=f"VTU-{uuid.uuid4().hex[:12]}",
                         raw=data)

    def list_variations(self, category, operator):
        if category == "cable":
            return [
                {"variation_id": "MOCK-COMPACT", "name": "Compact", "price": "19000",
                 "reseller_price": "18810", "validity": ""},
                {"variation_id": "MOCK-PADI", "name": "Padi", "price": "4400",
                 "reseller_price": "4356", "validity": ""},
            ]
        if category != "data":
            return []
        return [
            {"variation_id": "M1024", "name": "1GB - 30 days", "price": "499",
             "reseller_price": "470", "validity": "30 days"},
            {"variation_id": "M2048", "name": "2GB - 30 days", "price": "990",
             "reseller_price": "940", "validity": "30 days"},
        ]

    def verify_customer(self, service_id, customer_id, variation=None):
        details = {"service_name": service_id, "customer_id": customer_id,
                   "customer_name": "MOCK CUSTOMER"}
        if variation:  # electricity
            details.update({"min_purchase_amount": 500, "max_purchase_amount": 100000,
                            "customer_arrears": 0, "service_band": "A"})
        else:           # cable
            details.update({"current_bouquet": "Compact", "renewal_amount": 19000,
                            "status": "Active"})
        return details

    def get_status(self, provider_reference):
        return StatusResult(status=TxnStatus.SUCCESS,
                            provider_reference=provider_reference, raw={"mock": True})
