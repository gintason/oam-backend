"""Wallet API — all endpoints require a VERIFIED user (IsVerified gate)."""
from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .currency import resolve_currency
from .exceptions import UnsupportedCurrency
from .models import LedgerPosting, Wallet
from .serializers import OpenWalletSerializer, TransactionSerializer, WalletSerializer
from .services import WalletService


class WalletListView(APIView):
    """GET: list my wallets (auto-opening my default-currency wallet).
       POST: open a wallet for a specific currency."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        currency, source = resolve_currency(request.user, request)
        # Ensure the user always has at least their default wallet.
        WalletService.get_or_create_wallet(request.user, currency)
        wallets = Wallet.objects.filter(user=request.user).order_by("currency")
        return Response({
            "default_currency": currency,
            "default_currency_source": source,
            "wallets": WalletSerializer(wallets, many=True).data,
        })

    def post(self, request):
        serializer = OpenWalletSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            wallet = WalletService.get_or_create_wallet(
                request.user, serializer.validated_data["currency"]
            )
        except UnsupportedCurrency as exc:
            return Response({"detail": str(exc),
                             "supported": settings.SUPPORTED_CURRENCIES},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(WalletSerializer(wallet).data, status=status.HTTP_201_CREATED)


class WalletTransactionsView(ListAPIView):
    """GET: paginated statement (postings) for one of my wallets, newest first."""
    permission_classes = [IsAuthenticated, IsVerified]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        currency = self.kwargs["currency"].upper()
        wallet = (Wallet.objects.select_related("account")
                  .filter(user=self.request.user, currency=currency).first())
        if wallet is None:
            return LedgerPosting.objects.none()
        return (LedgerPosting.objects
                .filter(account=wallet.account)
                .select_related("journal")
                .order_by("-created_at"))


class DefaultCurrencyView(APIView):
    """GET: the currency we'd default this user to, and why."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        currency, source = resolve_currency(request.user, request)
        return Response({
            "currency": currency,
            "source": source,
            "supported": settings.SUPPORTED_CURRENCIES,
        })
