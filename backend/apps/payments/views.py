"""Funding endpoints + Paystack webhook receiver + a DEV-only simulate endpoint."""
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified
from integrations.base.dto import TxnStatus

from .models import ServiceTransaction
from .serializers import FundInitSerializer, ServiceTransactionSerializer
from .services import FundingService, WebhookService


class FundInitView(APIView):
    """POST: start funding. Returns the authorization URL to pay at."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        serializer = FundInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        txn, init = FundingService.initialize(
            request.user, serializer.validated_data["amount"],
            serializer.validated_data["currency"],
            callback_url=serializer.validated_data.get("callback_url") or None,
        )
        return Response({
            "transaction": ServiceTransactionSerializer(txn).data,
            "authorization_url": init.authorization_url,
            "reference": txn.internal_reference,
        }, status=status.HTTP_201_CREATED)


class FundVerifyView(APIView):
    """GET: client-side confirmation after the user returns from the gateway.
    Verifies with the provider and settles if paid."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, reference):
        txn = ServiceTransaction.objects.filter(
            internal_reference=reference, user=request.user).first()
        if txn is None:
            return Response({"detail": "Unknown reference."}, status=status.HTTP_404_NOT_FOUND)
        txn = FundingService.settle(reference)   # verifies via gateway
        return Response(ServiceTransactionSerializer(txn).data)


class PaystackWebhookView(APIView):
    """POST: Paystack calls this. Verify signature, persist, settle. Always 200 fast."""
    permission_classes = [AllowAny]
    authentication_classes = []      # no auth on webhooks

    def post(self, request):
        headers = {k.lower(): v for k, v in request.headers.items()}
        event, should_process = WebhookService.ingest("paystack", request.body, headers)
        # Paystack sends every event to this one URL, including transfer.* for
        # withdrawals and rider payouts. Hand those to the payouts app.
        if event.signature_valid and str(event.event_type or "").startswith("transfer."):
            try:
                from apps.payouts.services import WithdrawalService
                tdata = event.raw_payload.get("data", {}) or {}
                if tdata.get("reference"):
                    WithdrawalService.apply_transfer_status(
                        tdata["reference"], event.event_type.split(".", 1)[1], raw=event.raw_payload)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("transfer webhook handling failed")
        if should_process:
            data = event.raw_payload.get("data", {}) or {}
            st = data.get("status")
            verified = (TxnStatus.SUCCESS if st == "success"
                        else TxnStatus.FAILED if st in ("failed", "abandoned", "reversed")
                        else None)
            FundingService.settle(data.get("reference", ""), verified_status=verified, raw=data)
            try:  # [oam-deliveries] delivery card payments
                from apps.deliveries.services import PaymentService as _DlvPay
                _DlvPay.confirm_by_reference(data.get("reference", ""))
            except Exception:
                pass
            try:  # [oam-jobs] employer plans / job credits / boosts
                from apps.jobs.services import PaymentService as _JobsPay
                _JobsPay.activate_by_reference(data.get("reference", ""))
            except Exception:
                pass
            WebhookService.mark_processed(event)
        return Response({"status": "ok"}, status=status.HTTP_200_OK)

class FlutterwaveWebhookView(APIView):
    """
    POST: Flutterwave calls this.

    Used for the card leg of an international airtime top-up (Reloadly) and
    any other charge that was initialised on Flutterwave. Authentication is
    the `verif-hash` header compared to the secret hash configured in the
    Flutterwave dashboard — never trust the body.

    Return 200 for anything parseable: Flutterwave retries, then disables the
    endpoint, on errors.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        headers = {k.lower(): v for k, v in request.headers.items()}
        event, should_process = WebhookService.ingest("flutterwave", request.body, headers)
        # transfer.completed = a withdrawal paid from the Flutterwave balance
        # finished (SUCCESSFUL or FAILED). Hand it to the payouts app.
        if event.signature_valid and str(event.event_type or "").startswith("transfer."):
            try:
                from apps.payouts.services import WithdrawalService
                tdata = event.raw_payload.get("data", {}) or {}
                tst = str(tdata.get("status") or "").lower()
                tst = {"successful": "success", "failed": "failed"}.get(tst, "pending")
                if tdata.get("reference"):
                    WithdrawalService.apply_transfer_status(tdata["reference"], tst, raw=event.raw_payload)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("flutterwave transfer webhook handling failed")
        if should_process:
            data = event.raw_payload.get("data", {}) or {}
            st = str(data.get("status", "")).lower()
            ref = data.get("tx_ref") or data.get("reference") or ""
            verified = (TxnStatus.SUCCESS if st == "successful"
                        else TxnStatus.FAILED if st in ("failed", "cancelled")
                        else None)
            FundingService.settle(ref, verified_status=verified, raw=data)
            try:  # [oam-deliveries] delivery card payments
                from apps.deliveries.services import PaymentService as _DlvPay
                _DlvPay.confirm_by_reference(ref)
            except Exception:
                pass
            try:  # [oam-jobs] employer plans / job credits / boosts
                from apps.jobs.services import PaymentService as _JobsPay
                _JobsPay.activate_by_reference(ref)
            except Exception:
                pass
            WebhookService.mark_processed(event)
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
class PricingView(APIView):
    """GET /api/v1/payments/pricing/ -- supported currencies + per-currency listing
    prices, so the web/mobile apps can show local prices and only offer currencies
    that are actually enabled. Public; no money moves here."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.payments.pricing import pricing_payload
        return Response(pricing_payload())


class DevSimulateSuccessView(APIView):
    """
    DEV ONLY. Simulates a confirmed payment for a pending funding reference so you
    can test the full ledger-credit path without real Paystack. Disabled unless
    DEBUG is True.
    """
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        if not settings.DEBUG:
            return Response({"detail": "Not available."}, status=status.HTTP_404_NOT_FOUND)
        reference = request.data.get("reference", "")
        txn = ServiceTransaction.objects.filter(
            internal_reference=reference, user=request.user).first()
        if txn is None:
            return Response({"detail": "Unknown reference."}, status=status.HTTP_404_NOT_FOUND)
        txn = FundingService.settle(reference, verified_status=TxnStatus.SUCCESS,
                                    raw={"simulated": True})
        return Response(ServiceTransactionSerializer(txn).data)
