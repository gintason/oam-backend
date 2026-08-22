"""Marketplace endpoints. Browse is open to authenticated users; posting needs verification."""
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.generics import ListAPIView
import json

from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .models import Category, Listing, ListingImage, ListingVideo, LISTING_TTL_DAYS
from .serializers import (
    CategorySerializer,
    ListingDetailSerializer,
    ListingListSerializer,
    ListingWriteSerializer,
    SubscriptionSerializer,
)
from .services import MarketplaceError, MarketplaceService


class CategoryListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(is_active=True)


class ListingListView(ListAPIView):
    """GET /listings/ with filters: category, q, min_price, max_price, location, condition."""
    permission_classes = [IsAuthenticated]
    serializer_class = ListingListSerializer

    def get_queryset(self):
        p = self.request.query_params
        return MarketplaceService.browse(
            category=p.get("category"), q=p.get("q"),
            min_price=p.get("min_price"), max_price=p.get("max_price"),
            location=p.get("location"), condition=p.get("condition"),
        )


class ListingCreateView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        s = ListingWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        # Staff is the O.A.M Motors house account: route everything they post
        # into the O.A.M Motors category (featured), so it shows on the home page
        # under O.A.M Motors regardless of the category the form sent.
        if request.user.is_staff:
            from .motors import _motors_category
            data["category"] = _motors_category()
        category = data["category"]
        if not request.user.is_staff:
            try:
                MarketplaceService.check_can_post(request.user, category)
            except MarketplaceError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        images = data.pop("images", [])
        videos = data.pop("videos", [])
        featured = MarketplaceService.should_feature(request.user) or request.user.is_staff
        listing = Listing.objects.create(seller=request.user, is_featured=featured, **data)
        for i, url in enumerate(images):
            ListingImage.objects.create(listing=listing, url=url, is_primary=(i == 0))
        for url in videos:
            ListingVideo.objects.create(listing=listing, url=url)
        return Response(ListingDetailSerializer(listing).data, status=status.HTTP_201_CREATED)


class ListingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, listing_id):
        listing = (Listing.objects.select_related("category", "seller")
                   .prefetch_related("images").filter(id=listing_id).first())
        if listing is None or not listing.is_live:
            # owners can still view their own non-live listing
            if listing is None or listing.seller_id != request.user.id:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        Listing.objects.filter(pk=listing.pk).update(views_count=listing.views_count + 1)
        return Response(ListingDetailSerializer(listing, context={"request": request}).data)

    def patch(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id, seller=request.user).first()
        if listing is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        s = ListingWriteSerializer(listing, data=request.data, partial=True)
        s.is_valid(raise_exception=True)

        # images/videos are reverse relations on the model, so DRF's update()
        # would try to assign them to the instance and 500. Pop them out and
        # apply them ourselves. A missing key (partial edit) leaves media as-is;
        # an empty list clears it. Wrapped in a transaction so a mid-way failure
        # can't leave the listing half-updated (and returns a clean error).
        new_images = s.validated_data.pop("images", None)
        new_videos = s.validated_data.pop("videos", None)

        with transaction.atomic():
            s.save()

            if new_images is not None:
                listing.images.all().delete()
                for i, url in enumerate(new_images):
                    ListingImage.objects.create(listing=listing, url=url, is_primary=(i == 0))
            if new_videos is not None:
                listing.videos.all().delete()
                for url in new_videos:
                    ListingVideo.objects.create(listing=listing, url=url)

            # An edit changes what buyers see, so any prior admin verification no
            # longer applies — reset the badge until it's reviewed again.
            if listing.is_verified:
                listing.is_verified = False
                listing.verified_at = None
                listing.verified_by = None
                listing.save(update_fields=["is_verified", "verified_at", "verified_by", "updated_at"])

        listing.refresh_from_db()
        return Response(ListingDetailSerializer(listing, context={"request": request}).data)

    def delete(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id, seller=request.user).first()
        if listing is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        listing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListingRenewView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id, seller=request.user).first()
        if listing is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        listing.expires_at = timezone.now() + timedelta(days=LISTING_TTL_DAYS)
        listing.status = Listing.Status.ACTIVE
        listing.save(update_fields=["expires_at", "status", "updated_at"])
        return Response(ListingDetailSerializer(listing).data)


class ListingVerifyView(APIView):
    """Admin-only: attach or remove the 'verified' badge on a listing.

    POST /listings/<id>/verify/        -> verify
    POST /listings/<id>/verify/ {"verified": false} -> un-verify
    Listings stay live regardless; this only controls the trust badge.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id).first()
        if listing is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        verify = request.data.get("verified", True)
        if verify in (False, "false", "False", 0, "0"):
            listing.is_verified = False
            listing.verified_at = None
            listing.verified_by = None
        else:
            listing.is_verified = True
            listing.verified_at = timezone.now()
            listing.verified_by = request.user
        listing.save(update_fields=["is_verified", "verified_at", "verified_by", "updated_at"])
        return Response(ListingDetailSerializer(listing).data)


class MyListingsView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ListingListSerializer

    def get_queryset(self):
        return (Listing.objects.filter(seller=self.request.user)
                .select_related("category").prefetch_related("images"))


class SubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sub = MarketplaceService.get_subscription(request.user)
        return Response(SubscriptionSerializer(sub).data)


class SubscribeView(APIView):
    """POST /subscription/subscribe/ {tier} -- start Paystack card checkout."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        tier = request.data.get("tier")
        currency = request.data.get("currency", "NGN")
        try:
            payment, init = MarketplaceService.initiate_subscription(
                user=request.user, tier=tier, currency=currency)
        except MarketplaceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "detail": "Payment initialized. Complete payment to activate.",
            "tier": payment.tier,
            "amount": str(payment.amount),
            "currency": payment.currency,
            "reference": payment.reference,
            "authorization_url": init.authorization_url,
        }, status=status.HTTP_201_CREATED)


class SubscriptionVerifyView(APIView):
    """POST /subscription/verify/ {reference} -- confirm payment, activate tier."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        reference = request.data.get("reference")
        if not reference:
            return Response({"detail": "reference is required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            sub, payment = MarketplaceService.verify_subscription(
                user=request.user, reference=reference)
        except MarketplaceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "payment_status": payment.status,
            "tier": sub.tier,
            "expires_at": sub.expires_at,
            "reference": payment.reference,
        })


class SubscriptionWebhookView(APIView):
    """POST -- Paystack charge.success for subscription payments."""
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
        event = payload.get("event", "")
        data = payload.get("data", {}) or {}
        reference = data.get("reference") or data.get("tx_ref") or ""
        ok = (event == "charge.success") or (
            event == "charge.completed"
            and str(data.get("status", "")).lower() == "successful")
        if ok and reference:
            MarketplaceService.activate_by_reference(reference)
        return Response({"status": "ok"})
