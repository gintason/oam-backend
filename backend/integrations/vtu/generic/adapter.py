"""
Generic VTU (bill payment) API adapter skeleton.

VTU = airtime, data, electricity, cable TV. Point this at your chosen
aggregator (VTpass, Reloadly, Flutterwave Bills, etc.) by setting:
  - VTU_BASE_URL, VTU_API_KEY, VTU_SECRET

The flow (filled in during the Bill Payment phase): debit wallet -> call
aggregator -> persist provider_reference -> poll/verify status -> settle or
reverse on the ledger. This is an API integration (money flows through us),
so it implements the VTUProvider contract, not the affiliate one.
"""
from __future__ import annotations

from integrations.base import register
from integrations.base.interfaces import VTUProvider
from integrations.base.dto import VTURequest, VTUResult, StatusResult, TxnStatus


@register("vtu", "default")
class GenericVTUAdapter(VTUProvider):
    @property
    def base_url(self) -> str:                      # type: ignore[override]
        return self.config.get("base_url", "")

    def _headers(self) -> dict:
        return {"Accept": "application/json",
                "Authorization": f"Bearer {self.config.get('api_key', '')}"}

    def purchase(self, req: VTURequest) -> VTUResult:
        # TODO (Bill Payment phase): map req -> aggregator payload, POST, parse.
        raise NotImplementedError("Wire up your VTU aggregator in the Bill Payment phase.")

    def get_status(self, provider_reference: str) -> StatusResult:
        raise NotImplementedError("Implement status verification for your aggregator.")
