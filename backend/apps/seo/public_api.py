"""
Read-only public data for the pages search engines and signed-out visitors see.

    GET /api/v1/public/listings/?q=&category=&page=     active marketplace items
    GET /api/v1/public/listings/<id>/                    one item (no contact details)
    GET /api/v1/public/artisans/?q=&category=&city=&page=
    GET /api/v1/public/artisans/<id>/                    one profile (no phone, no street address)

Nothing here exposes a phone number, email or street address: contact details
stay behind an accepted in-app enquiry, exactly as for signed-in users.
"""
from __future__ import annotations

from django.db.models import Case, IntegerField, Q, When
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.homeservices.models import ArtisanProfile
from apps.homeservices.serializers import ArtisanDetailSerializer, ArtisanListSerializer
from apps.marketplace.models import Listing
from apps.marketplace.serializers import ListingDetailSerializer, ListingListSerializer

PAGE_SIZE = 24


def live_listings():
    now = timezone.now()
    return (Listing.objects.filter(status="active")
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)))


def public_artisans():
    return ArtisanProfile.objects.filter(status=ArtisanProfile.Status.ACTIVE)


def seller_display_name(listing) -> str:
    """First name only — never the email/phone the in-app serializer falls back to."""
    first = (getattr(listing.seller, "first_name", "") or "").strip()
    return first or "O.A.M seller"


def _page(request) -> int:
    try:
        return max(1, int(request.query_params.get("page", 1)))
    except (TypeError, ValueError):
        return 1


class _Public(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class PublicListingSearchView(_Public):
    def get(self, request):
        qs = live_listings().select_related("category").prefetch_related("images", "videos")
        q = (request.query_params.get("q") or "").strip()[:80]
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(location__icontains=q))
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(category__slug=cat)
        qs = qs.annotate(rank=Case(When(is_featured=True, then=0), default=1,
                                   output_field=IntegerField())).order_by("rank", "-created_at")
        page = _page(request)
        total = qs.count()
        rows = list(qs[(page - 1) * PAGE_SIZE: page * PAGE_SIZE])
        return Response({"count": total, "page": page, "page_size": PAGE_SIZE,
                         "results": ListingListSerializer(rows, many=True).data})


def listing_payload(listing, request=None) -> dict:
    data = ListingDetailSerializer(listing, context={"request": request}).data
    data["seller_name"] = seller_display_name(listing)
    for k in ("is_owner", "liked"):
        data.pop(k, None)
    return data


class PublicListingDetailView(_Public):
    def get(self, request, listing_id):
        listing = (live_listings().select_related("category", "seller")
                   .prefetch_related("images", "videos").filter(id=listing_id).first())
        if listing is None:
            return Response({"detail": "This item is no longer available."}, status=404)
        return Response(listing_payload(listing, request))


class PublicArtisanSearchView(_Public):
    def get(self, request):
        now = timezone.now()
        qs = public_artisans().select_related("category")
        q = (request.query_params.get("q") or "").strip()[:80]
        if q:
            qs = qs.filter(Q(business_name__icontains=q) | Q(description__icontains=q)
                           | Q(category__name__icontains=q) | Q(city__icontains=q))
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))
        city = (request.query_params.get("city") or "").strip()
        if city:
            qs = qs.filter(city__iexact=city)
        # Verified first, then boosted, then most viewed.
        qs = qs.annotate(
            v_rank=Case(When(is_verified=True, then=0), default=1, output_field=IntegerField()),
            b_rank=Case(When(is_featured=True, featured_until__gt=now, then=0),
                        When(is_featured=True, featured_until__isnull=True, then=0),
                        default=1, output_field=IntegerField()),
        ).order_by("v_rank", "b_rank", "-views_count", "-created_at")
        page = _page(request)
        total = qs.count()
        rows = list(qs[(page - 1) * PAGE_SIZE: page * PAGE_SIZE])
        return Response({"count": total, "page": page, "page_size": PAGE_SIZE,
                         "results": ArtisanListSerializer(rows, many=True).data})


PRIVATE_ARTISAN_FIELDS = ("address", "latitude", "longitude", "distance_km", "phone", "whatsapp")


def artisan_payload(profile) -> dict:
    data = dict(ArtisanDetailSerializer(profile).data)
    for k in PRIVATE_ARTISAN_FIELDS:
        data.pop(k, None)
    return data


class PublicArtisanDetailView(_Public):
    def get(self, request, artisan_id):
        profile = public_artisans().select_related("category").filter(id=artisan_id).first()
        if profile is None:
            return Response({"detail": "This profile isn't available."}, status=404)
        return Response(artisan_payload(profile))
