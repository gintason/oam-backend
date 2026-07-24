"""
Customer-facing order refresh.

WHY A NEW ENDPOINT
  The existing requery endpoint calls BillingService.poll(), and poll() ->
  _apply() returns early for orders already in a final state. That's correct for
  status (you don't re-settle a settled order) but it means a token that arrives
  AFTER the status flips can never be collected — which is exactly what happened
  twice on live orders: vtu.ng marked the order completed, then attached
  meta_data.electricity_token to the `resolve` layer moments later.

  Until now the only cure was a shell command. Customers can't do that. This
  endpoint gives them the same recovery the sweeper performs.

WHAT IT DOES
  pending / processing        -> poll the provider and settle
  success + missing token     -> requery, merge the fresh payload, re-extract
  anything else               -> return as-is (cheap, safe to call repeatedly)

It never re-charges and never re-purchases: it only reads from the provider and
copies what it finds onto the order.

ROUTE
  POST /api/v1/billing/orders/<reference>/refresh/
"""
from __future__ import annotations

from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .models import BillOrder
from .serializers import BillOrderSerializer
from .services import BillingService, ProviderFactory


def refresh_order(order: BillOrder) -> BillOrder:
    """Bring one order up to date with the provider. Safe to call repeatedly."""
    state = str(order.status).lower()

    # 1. Not settled yet -> ask the provider and apply the outcome.
    if state in ("pending", "processing"):
        try:
            order = BillingService.poll(order)
        except Exception:                                  # noqa: BLE001
            return order
        state = str(order.status).lower()

    # 2. Settled successfully but no token yet (prepaid electricity only).
    needs_token = (
        state == "success"
        and order.category == "electricity"
        and (order.meter_type or "").lower() != "postpaid"
        and not order.token
    )
    if not needs_token:
        return order

    # 2a. The token may already be sitting in the payload we hold.
    BillingService._extract_details(order, order.response_payload)
    if order.token:
        order.save(update_fields=["token", "units", "customer_name", "updated_at"])
        return order

    # 2b. Otherwise ask the provider for a fresh `resolve` layer.
    try:
        result = ProviderFactory.get("vtu").get_status(order.reference)
    except Exception:                                      # noqa: BLE001
        return order

    merged = {**(order.response_payload or {}), **(result.raw or {})}
    BillingService._extract_details(order, merged)
    if order.token:
        order.response_payload = merged
        order.save(update_fields=["token", "units", "customer_name",
                                  "response_payload", "updated_at"])
    return order


class OrderRefreshView(APIView):
    """POST /billing/orders/<reference>/refresh/ — settle and collect the token."""

    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request, reference):
        order = BillOrder.objects.filter(user=request.user, reference=reference).first()
        if order is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        return Response(BillOrderSerializer(refresh_order(order)).data)


class OrdersRefreshAllView(APIView):
    """
    POST /billing/orders/refresh/ — refresh every unfinished order for this user.

    This is what the Refresh button on Order history calls, so one tap resolves
    whatever is outstanding instead of the customer hunting for the right row.
    Capped so a large history can't turn one tap into dozens of provider calls.
    """

    permission_classes = [IsAuthenticated, IsVerified]
    MAX = 10

    def post(self, request):
        qs = BillOrder.objects.filter(user=request.user).order_by("-created_at")[:40]
        targets = [
            o for o in qs
            if str(o.status).lower() in ("pending", "processing")
            or (str(o.status).lower() == "success"
                and o.category == "electricity"
                and (o.meter_type or "").lower() != "postpaid"
                and not o.token)
        ][: self.MAX]

        refreshed = [refresh_order(o) for o in targets]
        return Response({
            "checked": len(targets),
            "orders": BillOrderSerializer(refreshed, many=True).data,
        })
