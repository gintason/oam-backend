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
        return VTUResult(status=TxnStatus.SUCCESS,
                         provider_reference=f"VTU-{uuid.uuid4().hex[:12]}",
                         raw={"mock": True})

    def get_status(self, provider_reference):
        return StatusResult(status=TxnStatus.SUCCESS,
                            provider_reference=provider_reference, raw={"mock": True})
