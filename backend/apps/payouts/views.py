"""Admin-only withdrawals to bank (Paystack Transfers)."""
import json

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.wallet.exceptions import InsufficientFunds
from integrations.base import ProviderFactory

from .models import BankAccount, WithdrawalOrder
from .serializers import (
    AddBankSerializer,
    BankAccountSerializer,
    ResolveAccountSerializer,
    WithdrawalOrderSerializer,
    WithdrawSerializer,
)
from .services import WithdrawalError, WithdrawalService


class BankListView(APIView):
    """GET /banks-list/?currency=NGN — banks supported by the provider."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        currency = request.query_params.get("currency", "NGN")
        return Response({"banks": WithdrawalService.list_banks(currency)})


class ResolveAccountView(APIView):
    """POST /resolve-account/ {bank_code, account_number} — preview account name."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        s = ResolveAccountSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            resolved = WithdrawalService.resolve_account(**s.validated_data)
        except WithdrawalError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(resolved)


class BankAccountsView(ListAPIView):
    """GET /banks/ (list saved) ; POST /banks/ (resolve + save a payout account)."""
    permission_classes = [IsAdminUser]
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user, is_active=True)

    def post(self, request):
        s = AddBankSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            account = WithdrawalService.add_bank_account(user=request.user, **s.validated_data)
        except WithdrawalError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BankAccountSerializer(account).data, status=status.HTTP_201_CREATED)


class WithdrawView(APIView):
    """POST /withdrawals/ {bank_account_id, amount} — send money to a saved bank."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        s = WithdrawSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        account = BankAccount.objects.filter(
            id=data["bank_account_id"], user=request.user, is_active=True).first()
        if account is None:
            return Response({"detail": "Bank account not found."},
                            status=status.HTTP_404_NOT_FOUND)
        try:
            order = WithdrawalService.withdraw(
                user=request.user, bank_account=account,
                amount=data["amount"], currency=data["currency"])
        except InsufficientFunds as exc:
            return Response({"detail": str(exc), "reason": "insufficient_funds"},
                            status=status.HTTP_402_PAYMENT_REQUIRED)
        except WithdrawalError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_201_CREATED if order.status == WithdrawalOrder.Status.SUCCESS \
            else status.HTTP_200_OK
        return Response(WithdrawalOrderSerializer(order).data, status=code)


class WithdrawalListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = WithdrawalOrderSerializer

    def get_queryset(self):
        return WithdrawalOrder.objects.filter(user=self.request.user)


class WithdrawalWebhookView(APIView):
    """POST — Paystack transfer.success / transfer.failed / transfer.reversed."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        provider = ProviderFactory.get("payouts")
        headers = {k.lower(): v for k, v in request.headers.items()}
        verify = getattr(provider, "verify_webhook", None)
        if verify and not verify(request.body, headers):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_403_FORBIDDEN)
        try:
            payload = json.loads(request.body or b"{}")
        except ValueError:
            payload = {}
        event = payload.get("event", "")
        data = payload.get("data", {}) or {}
        reference = data.get("reference", "")
        if event.startswith("transfer.") and reference:
            transfer_status = event.split(".", 1)[1]      # success / failed / reversed
            WithdrawalService.apply_transfer_status(reference, transfer_status, raw=payload)
        return Response({"status": "ok"})
