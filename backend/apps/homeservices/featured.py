"""
Public "Featured artisans" for the landing page.

WHY A SEPARATE ENDPOINT
  ArtisanSearchView requires authentication AND coordinates — it's a proximity
  search, which is right for the in-app browse screen. The landing page is
  neither: it's seen by people who aren't signed in and haven't granted
  location, and it needs a national shortlist rather than a radius.

WHO APPEARS
  Only artisans an admin has VERIFIED. That's the whole point of the badge — a
  visitor's first impression of the platform shouldn't include profiles nobody
  has checked. Boosted profiles rank first among the verified, since that's
  what the boost buys.

WHAT IT RETURNS
  ArtisanListSerializer, which carries no phone number. Contacts stay behind an
  accepted enquiry even for signed-in users, so a public endpoint certainly
  can't expose them.
"""
from __future__ import annotations

from django.db.models import Case, IntegerField, Q, When
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ArtisanProfile
from .serializers import ArtisanListSerializer

MAX_RESULTS = 12


class FeaturedArtisansView(APIView):
    """GET /homeservices/featured/?category=<slug>&limit=8 — public."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        now = timezone.now()

        qs = (
            ArtisanProfile.objects
            .filter(is_verified=True, status=ArtisanProfile.Status.ACTIVE)
            .select_related("category")
        )

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(Q(category__slug=category) | Q(category__name__iexact=category))

        # A boost that has quietly expired shouldn't keep buying placement.
        qs = qs.annotate(
            boost_rank=Case(
                When(is_featured=True, featured_until__gt=now, then=0),
                When(is_featured=True, featured_until__isnull=True, then=0),
                default=1,
                output_field=IntegerField(),
            )
        ).order_by("boost_rank", "-views_count", "-created_at")

        try:
            limit = min(int(request.query_params.get("limit", 8)), MAX_RESULTS)
        except (TypeError, ValueError):
            limit = 8

        results = list(qs[:limit])
        return Response({
            "count": len(results),
            "results": ArtisanListSerializer(results, many=True).data,
        })


class ServiceCategoriesPublicView(APIView):
    """
    GET /homeservices/categories/public/ — trades, for the landing-page filter.

    The existing categories endpoint is behind auth; this is the same data for
    people who haven't signed up yet.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from .models import ServiceCategory
        from .serializers import ServiceCategorySerializer

        qs = ServiceCategory.objects.filter(is_active=True).order_by("order", "name")
        return Response({"results": ServiceCategorySerializer(qs, many=True).data})
