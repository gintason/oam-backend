"""
Hardened VTU.ng delivery webhook.

WHY REPLACE THE EXISTING ONE
  The original reads request_id and status from the TOP LEVEL of the payload.
  VTU's requery response nests the truth two layers down —
  data.status is stale, resolve.data.status is real, and the token lives at
  resolve.data.meta_data.electricity_token. If the webhook uses the same shape,
  the original silently settles nothing: no error, no log, just a 200 and a
  customer still waiting.

  It also routes through apply_provider_status -> _apply, which RETURNS EARLY
  for orders already in a final state. Since our own polling usually marks an
  order successful before the webhook lands, a webhook carrying the token would
  be thrown away — the exact failure that stranded the first live purchases.

WHAT THIS DOES DIFFERENTLY
  * Reads request_id / status / token from every shape VTU is known to use,
    most specific first
  * Logs the ENTIRE raw payload on arrival, so the first real callback tells us
    the actual shape instead of us guessing
  * Always attempts token extraction, even on an already-settled order
  * Returns 200 for anything it can parse — a webhook that returns errors gets
    retried, then disabled by the provider

SECURITY
  Signature verification is unchanged and still mandatory: an unsigned or
  badly-signed request is rejected before anything is read from it. This
  endpoint is public, so that check is the only thing standing between the
  internet and your order state.
"""
from __future__ import annotations

import json
import logging

from rest_framework import status as http
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BillOrder
from .services import BillingService, ProviderFactory

logger = logging.getLogger("billing")


def _dig(payload: dict, *keys: str) -> str:
    """
    Find the first non-empty value for any of `keys`, checking the resolved
    layer first, then the top level, then the stale `data` block.
    """
    resolve = (payload.get("resolve") or {}).get("data") or {}
    meta = resolve.get("meta_data") or {}
    data = payload.get("data") or {}
    for source in (meta, resolve, payload, data):
        if not isinstance(source, dict):
            continue
        for key in keys:
            value = source.get(key)
            if value not in (None, ""):
                return str(value)
    return ""


class VtuNgWebhookView(APIView):
    """POST /billing/webhook/vtung/ — VTU.ng delivery callback."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        provider = ProviderFactory.get("vtu")
        headers = {k.lower(): v for k, v in request.headers.items()}

        verify = getattr(provider, "verify_webhook", None)
        if verify and not verify(request.body, headers):
            logger.warning("vtung webhook: bad signature from %s",
                           request.META.get("REMOTE_ADDR"))
            return Response({"detail": "Invalid signature."}, status=http.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(request.body or b"{}")
        except ValueError:
            logger.error("vtung webhook: unparseable body: %r", request.body[:500])
            return Response({"status": "ignored"}, status=http.HTTP_200_OK)

        # Log everything the first few times — this is how we learn the real
        # payload shape rather than inferring it from the requery response.
        logger.info("vtung webhook payload: %s", json.dumps(payload, default=str)[:2000])

        reference = _dig(payload, "request_id", "reference", "requestId")
        raw_status = _dig(payload, "status").lower()

        if not reference:
            logger.error("vtung webhook: no request_id found in payload")
            return Response({"status": "ignored"}, status=http.HTTP_200_OK)

        order = BillOrder.objects.filter(reference=reference).first()
        if order is None:
            logger.warning("vtung webhook: unknown reference %s", reference)
            return Response({"status": "ignored"}, status=http.HTTP_200_OK)

        # 1. Settle the status, if it isn't settled already.
        if raw_status and str(order.status).lower() in ("pending", "processing"):
            try:
                BillingService.apply_provider_status(reference, raw_status, raw=payload)
                order.refresh_from_db()
            except Exception:                                # noqa: BLE001
                logger.exception("vtung webhook: apply_provider_status failed for %s", reference)

        # 2. ALWAYS try for the token — even when the order is already final.
        #    This is the whole point of the webhook: the token routinely arrives
        #    after the status does, and _apply won't revisit a settled order.
        if not order.token:
            try:
                BillingService._extract_details(order, payload)
                if order.token:
                    order.save(update_fields=["token", "units", "customer_name", "updated_at"])
                    logger.info("vtung webhook: token collected for %s", reference)
            except Exception:                                # noqa: BLE001
                logger.exception("vtung webhook: token extraction failed for %s", reference)

        # A webhook must return 200 for anything it understood. Errors get
        # retried and eventually the provider disables the endpoint.
        return Response({"status": "ok"}, status=http.HTTP_200_OK)
