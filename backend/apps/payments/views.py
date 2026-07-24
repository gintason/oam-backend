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
        if should_process:
            data = event.raw_payload.get("data", {}) or {}
            st = data.get("status")
            verified = (TxnStatus.SUCCESS if st == "success"
                        else TxnStatus.FAILED if st in ("failed", "abandoned", "reversed")
                        else None)
            FundingService.settle(data.get("reference", ""), verified_status=verified, raw=data)
            WebhookService.mark_processed(event)
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


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
