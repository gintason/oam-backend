"""Bill payment endpoints — verified users only, plus VTU webhook + requery."""
import json

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified
from apps.wallet.exceptions import InsufficientFunds
from integrations.base import ProviderFactory

from .models import BillOrder
from .serializers import BillerSerializer, BillOrderSerializer, PurchaseSerializer
from .services import BillingError, BillingService


class BillerListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsVerified]
    serializer_class = BillerSerializer

    def get_queryset(self):
        return BillingService.list_billers(
            country=self.request.query_params.get("country", "NG"),
            category=self.request.query_params.get("category"),
        )


class PurchaseView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            if data["category"] == "data":
                variation_id = data.get("variation_id") or data.get("plan_code")
                if not variation_id:
                    return Response({"detail": "variation_id is required for data."},
                                    status=status.HTTP_400_BAD_REQUEST)
                order = BillingService.purchase_data(
                    user=request.user, country=data["country"], code=data["code"],
                    recipient=data["recipient"], variation_id=variation_id,
                    currency=data["currency"],
                )
            elif data["category"] == "cable":
                variation_id = data.get("variation_id") or data.get("plan_code")
                verification_id = data.get("verification_id")
                if not variation_id or not verification_id:
                    return Response({"detail": "variation_id and verification_id are required."},
                                    status=status.HTTP_400_BAD_REQUEST)
                order = BillingService.purchase_cable(
                    user=request.user, country=data["country"], code=data["code"],
                    customer_id=data["recipient"], variation_id=variation_id,
                    verification_id=verification_id, currency=data["currency"],
                )
            elif data["category"] == "electricity":
                meter_type = data.get("meter_type") or data.get("variation_id")
                verification_id = data.get("verification_id")
                if not meter_type or not verification_id or data.get("amount") in (None, ""):
                    return Response({"detail": "meter_type, amount and verification_id are required."},
                                    status=status.HTTP_400_BAD_REQUEST)
                order = BillingService.purchase_electricity(
                    user=request.user, country=data["country"], code=data["code"],
                    customer_id=data["recipient"], meter_type=meter_type,
                    amount=data["amount"], verification_id=verification_id,
                    currency=data["currency"],
                )
            else:
                if data.get("amount") in (None, ""):
                    return Response({"detail": "amount is required."},
                                    status=status.HTTP_400_BAD_REQUEST)
                order = BillingService.purchase(
                    user=request.user, country=data["country"], category=data["category"],
                    code=data["code"], recipient=data["recipient"], amount=data["amount"],
                    currency=data["currency"], plan_code=data.get("plan_code", ""),
                )
        except InsufficientFunds as exc:
            return Response({"detail": str(exc), "reason": "insufficient_funds"},
                            status=status.HTTP_402_PAYMENT_REQUIRED)
        except BillingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_201_CREATED if order.status == BillOrder.Status.SUCCESS \
            else status.HTTP_200_OK
        return Response(BillOrderSerializer(order).data, status=code)


class DataPlansView(APIView):
    """GET /data-plans/?country=NG&code=MTN — live data bundles for a network."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        country = request.query_params.get("country", "NG")
        code = request.query_params.get("code")
        if not code:
            return Response({"detail": "code (network) is required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            plans = BillingService.data_variations(country, code)
        except BillingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        # Hide our internal reseller cost from users; show only what they pay.
        public = [{"variation_id": p_.get("variation_id"), "name": p_.get("name"),
                   "price": p_.get("price"), "validity": p_.get("validity")}
                  for p_ in plans]
        return Response({"country": country.upper(), "code": code, "plans": public})


class VerifyCustomerView(APIView):
    """POST /verify-customer/ {category, code, customer_id, variation?} -> customer name."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        d = request.data
        category = d.get("category")
        code = d.get("code")
        customer_id = d.get("customer_id") or d.get("recipient")
        variation = d.get("variation") or d.get("meter_type") or None
        if category not in ("cable", "electricity") or not code or not customer_id:
            return Response({"detail": "category (cable/electricity), code and customer_id are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        if category == "electricity" and not variation:
            return Response({"detail": "meter_type (prepaid/postpaid) is required for electricity."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            result = BillingService.verify_customer(
                user=request.user, country=d.get("country", "NG"), category=category,
                code=code, customer_id=customer_id, variation=variation,
            )
        except BillingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class TvPlansView(APIView):
    """GET /tv-plans/?country=NG&code=dstv -- live cable packages."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        country = request.query_params.get("country", "NG")
        code = request.query_params.get("code")
        if not code:
            return Response({"detail": "code (provider) is required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            plans = BillingService.tv_variations(country, code)
        except BillingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        public = [{"variation_id": p_.get("variation_id"), "name": p_.get("name"),
                   "price": p_.get("price")} for p_ in plans]
        return Response({"country": country.upper(), "code": code, "plans": public})


class OrderListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsVerified]
    serializer_class = BillOrderSerializer

    def get_queryset(self):
        return BillOrder.objects.filter(user=self.request.user)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, reference):
        order = BillOrder.objects.filter(user=request.user, reference=reference).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BillOrderSerializer(order).data)


class OrderRequeryView(APIView):
    """POST /orders/<reference>/requery/ — resolve a still-processing order now."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request, reference):
        order = BillOrder.objects.filter(user=request.user, reference=reference).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        order = BillingService.poll(order)
        return Response(BillOrderSerializer(order).data)


class VtuNgWebhookView(APIView):
    """POST — VTU.ng calls this on completed-api / refunded. Verify + settle."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        provider = ProviderFactory.get("vtu")
        headers = {k.lower(): v for k, v in request.headers.items()}
        verify = getattr(provider, "verify_webhook", None)
        if verify and not verify(request.body, headers):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_403_FORBIDDEN)
        try:
            payload = json.loads(request.body or b"{}")
        except ValueError:
            payload = {}
        BillingService.apply_provider_status(
            payload.get("request_id", ""), (payload.get("status") or "").lower(), raw=payload
        )
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


# ----------------------- OAM revenue (admin only) -----------------------
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum
from rest_framework.permissions import IsAdminUser
from apps.wallet.services import WalletService


class RevenueView(APIView):
    """GET /revenue/ — accumulated OAM profit per currency (admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = []
        for currency in settings.SUPPORTED_CURRENCIES:
            ledger_balance = WalletService.revenue_balance(currency)
            booked = (BillOrder.objects.filter(currency=currency, status=BillOrder.Status.SUCCESS)
                      .aggregate(s=Sum("revenue_amount"))["s"] or Decimal("0"))
            if ledger_balance or booked:
                rows.append({
                    "currency": currency,
                    "available_to_sweep": str(ledger_balance),   # not yet swept
                    "total_earned": str(booked),                 # lifetime from bills
                })
        return Response({"revenue": rows})


class RevenueSweepView(APIView):
    """POST /revenue/sweep/ {currency, amount} — move revenue into the admin's wallet."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        currency = (request.data.get("currency") or "NGN").upper()
        amount = request.data.get("amount")
        if amount in (None, ""):
            return Response({"detail": "amount is required."}, status=status.HTTP_400_BAD_REQUEST)
        wallet = WalletService.get_or_create_wallet(request.user, currency)
        try:
            WalletService.sweep_revenue(wallet, amount,
                                        description=f"Revenue sweep by {request.user.identifier}")
        except Exception as exc:  # InsufficientFunds etc.
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        wallet.refresh_from_db()
        return Response({
            "detail": "Revenue swept to your wallet.",
            "currency": currency,
            "wallet_balance": str(wallet.cached_balance),
            "revenue_remaining": str(WalletService.revenue_balance(currency)),
        })
