"""Home services endpoints: directory + proximity search + paid boost."""
import json

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .models import ArtisanProfile, ServiceCategory
from .serializers import (
    ArtisanDetailSerializer,
    ArtisanOwnerSerializer,
    ArtisanListSerializer,
    ArtisanWriteSerializer,
    ServiceCategorySerializer,
)
from .services import HomeServiceError, HomeServiceService


class ServiceCategoryListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceCategorySerializer

    def get_queryset(self):
        return ServiceCategory.objects.filter(is_active=True)


class ArtisanRegisterView(APIView):
    """POST /artisans/ — register (once) as an artisan."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        if hasattr(request.user, "artisan_profile"):
            return Response({"detail": "You already have an artisan profile."},
                            status=status.HTTP_400_BAD_REQUEST)
        s = ArtisanWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        profile = s.save(user=request.user)
        return Response(ArtisanOwnerSerializer(profile).data, status=status.HTTP_201_CREATED)


class MyArtisanView(APIView):
    """GET/PATCH /artisans/me/ — view or update your own profile (incl. location)."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        profile = getattr(request.user, "artisan_profile", None)
        if profile is None:
            return Response({"detail": "No artisan profile yet."},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(ArtisanOwnerSerializer(profile).data)

    def patch(self, request):
        profile = getattr(request.user, "artisan_profile", None)
        if profile is None:
            return Response({"detail": "No artisan profile yet."},
                            status=status.HTTP_404_NOT_FOUND)
        s = ArtisanWriteSerializer(profile, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(ArtisanOwnerSerializer(profile).data)


class ArtisanSearchView(APIView):
    """GET /artisans/?lat=..&lng=..&radius_km=10&category=mechanic&q=.."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        p = request.query_params
        lat, lng = p.get("lat"), p.get("lng")
        if lat is None or lng is None:
            return Response({"detail": "lat and lng are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            results = HomeServiceService.search_nearby(
                lat=lat, lng=lng, radius_km=p.get("radius_km", 10),
                category=p.get("category"), q=p.get("q"),
            )
        except (ValueError, TypeError):
            return Response({"detail": "lat, lng and radius_km must be numbers."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"count": len(results),
                         "results": ArtisanListSerializer(results, many=True).data})


class ArtisanDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, artisan_id):
        profile = (ArtisanProfile.objects.select_related("category")
                   .filter(id=artisan_id, status=ArtisanProfile.Status.ACTIVE).first())
        if profile is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ArtisanProfile.objects.filter(pk=profile.pk).update(
            views_count=profile.views_count + 1)
        return Response(ArtisanDetailSerializer(profile).data)


class BoostInitView(APIView):
    """POST /artisans/boost/ {days} — start a Paystack boost payment."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        days = request.data.get("days", 30)
        currency = request.data.get("currency", "NGN")
        try:
            payment, init = HomeServiceService.initiate_boost(
                user=request.user, days=days, currency=currency)
        except HomeServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "detail": "Payment initialized. Complete payment to activate boost.",
            "days": payment.days, "amount": str(payment.amount),
            "currency": payment.currency, "reference": payment.reference,
            "authorization_url": init.authorization_url,
        }, status=status.HTTP_201_CREATED)


class BoostVerifyView(APIView):
    """POST /artisans/boost/verify/ {reference}."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        reference = request.data.get("reference")
        if not reference:
            return Response({"detail": "reference is required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            payment = HomeServiceService.verify_boost(user=request.user, reference=reference)
        except HomeServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        profile = getattr(request.user, "artisan_profile", None)
        return Response({
            "payment_status": payment.status,
            "featured_until": getattr(profile, "featured_until", None),
            "reference": payment.reference,
        })


class BoostWebhookView(APIView):
    """POST — Paystack charge.success for artisan boosts."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.conf import settings
        from integrations.base import ProviderFactory
        headers = {k.lower(): v for k, v in request.headers.items()}
        provider = ("flutterwave" if headers.get("verif-hash")
                    else settings.DEFAULT_PROVIDERS.get("payments", "paystack"))
        gateway = ProviderFactory.get("payments", provider)
        verify = getattr(gateway, "verify_webhook", None)
        if verify and not verify(request.body, headers):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_403_FORBIDDEN)
        try:
            payload = json.loads(request.body or b"{}")
        except ValueError:
            payload = {}
        data = payload.get("data", {}) or {}
        reference = data.get("reference") or data.get("tx_ref") or ""
        event = payload.get("event", "")
        ok = (event == "charge.success") or (
            event == "charge.completed"
            and str(data.get("status", "")).lower() == "successful")
        if ok and reference.startswith("BOOST-"):
            HomeServiceService.activate_by_reference(reference)
        return Response({"status": "ok"})
