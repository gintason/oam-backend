"""Affiliate endpoints: rich program cards + tracked deep-links.

Covers travel (flights/carhire/transfers), gift cards, and hotels — all through
the same AffiliateService (records a click, mints a sub_id, builds the link).
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .catalog import TRAVEL_BY_SLUG, TRAVEL_PROGRAMS
from .catalog_giftcards import GIFTCARD_BY_SLUG, GIFTCARD_PROGRAMS
from .catalog_hotels import HOTEL_BY_SLUG, HOTEL_PROGRAMS
from .serializers import TravelLinkRequestSerializer
from .services import AffiliateService


def _build_and_respond(program, request):
    s = TravelLinkRequestSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    params = s.validated_data.get("params", {}) or {}
    link = AffiliateService.link(
        category=program["category"], user=request.user, params=params,
    )
    accepted = {p["key"] for p in program["params"]}
    return Response({
        "program": program["name"],
        "category": program["category"],
        "url": link.url,
        "sub_id": link.sub_id,
        "applied_params": {k: v for k, v in params.items() if k in accepted},
        "ignored_params": {k: v for k, v in params.items() if k not in accepted},
    })


class TravelProgramsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"programs": TRAVEL_PROGRAMS})


class TravelLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        program = TRAVEL_BY_SLUG.get(slug)
        if program is None:
            return Response({"detail": "Unknown travel program."},
                            status=status.HTTP_404_NOT_FOUND)
        return _build_and_respond(program, request)


class GiftcardProgramsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"programs": GIFTCARD_PROGRAMS})


class GiftcardLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        program = GIFTCARD_BY_SLUG.get(slug)
        if program is None:
            return Response({"detail": "Unknown gift-card program."},
                            status=status.HTTP_404_NOT_FOUND)
        return _build_and_respond(program, request)


class HotelProgramsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"programs": HOTEL_PROGRAMS})


class HotelLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        program = HOTEL_BY_SLUG.get(slug)
        if program is None:
            return Response({"detail": "Unknown hotel program."},
                            status=status.HTTP_404_NOT_FOUND)
        return _build_and_respond(program, request)
