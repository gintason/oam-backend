"""
Public marketplace listings for the landing page.

WHY THIS EXISTS
  ListingListView requires authentication. The landing page is seen by people
  who haven't signed up — and showing them an empty or invented marketplace is
  precisely the wrong first impression, in opposite directions. They should see
  what's genuinely for sale.

WHAT IT RETURNS
  ListingListSerializer, which carries no contact details. Phone numbers stay
  behind an accepted enquiry, so a public endpoint certainly doesn't expose
  them.
"""
from __future__ import annotations

from django.db.models import Case, IntegerField, Q, When
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Listing
from .serializers import CategorySerializer, ListingListSerializer

MAX_RESULTS = 24


class PublicListingsView(APIView):
    """GET /marketplace/public/listings/?category=<slug>&limit=8"""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        now = timezone.now()

        qs = (
            Listing.objects
            .filter(status="active")
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .select_related("category")
            .prefetch_related("images")
        )

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)

        # Featured first — that's what a paid plan buys — then newest.
        qs = qs.annotate(
            rank=Case(When(is_featured=True, then=0), default=1, output_field=IntegerField())
        ).order_by("rank", "-created_at")

        try:
            limit = min(int(request.query_params.get("limit", 8)), MAX_RESULTS)
        except (TypeError, ValueError):
            limit = 8

        results = list(qs[:limit])
        return Response({
            "count": len(results),
            "results": ListingListSerializer(results, many=True).data,
        })


class PublicCategoriesView(APIView):
    """GET /marketplace/public/categories/ — for the landing-page tabs."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        qs = Category.objects.filter(is_active=True).order_by("order", "name")
        return Response({"results": CategorySerializer(qs, many=True).data})
