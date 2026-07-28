"""Affiliate endpoints: rich program cards + tracked deep-links.

Covers travel (flights/carhire/transfers), gift cards, and hotels — all through
the same AffiliateService (records a click, mints a sub_id, builds the link).
"""
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.base.affiliate_links import sanitize_affiliate_url

from .catalog import TRAVEL_BY_SLUG, TRAVEL_PROGRAMS
from .catalog_giftcards import GIFTCARD_BY_SLUG, GIFTCARD_PROGRAMS
from .catalog_hotels import HOTEL_BY_SLUG, HOTEL_PROGRAMS
from .serializers import TravelLinkRequestSerializer
from .services import AffiliateService

# All affiliate programs by slug, across every catalog, for the redirect route.
_ALL_PROGRAMS = {**TRAVEL_BY_SLUG, **GIFTCARD_BY_SLUG, **HOTEL_BY_SLUG}


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


class AffiliateRedirectView(APIView):
    """
    GET /api/v1/affiliates/go/<slug>/?<search params>

    A stable internal redirect endpoint. The app links here (never to a raw
    partner short-link), so destinations can be fixed via env/config without a
    frontend redeploy, and blocked tpk.ro hosts are stripped before the browser
    ever sees them. Records the click (attribution) then 302s to a clean URL.

    Search params are passed through as deep-link params where the program
    accepts them (e.g. ?destination=Dubai&check_in=2026-08-01).

    Public on purpose: it's opened in a new browser tab (which can't carry the
    app's bearer token), and it only issues a redirect to a public partner
    site. When the request happens to be authenticated, the click is attributed
    to that user; otherwise it's recorded anonymously.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        program = _ALL_PROGRAMS.get(slug)
        if program is None:
            return Response({"detail": "Unknown affiliate program."},
                            status=status.HTTP_404_NOT_FOUND)
        params = {k: v for k, v in request.query_params.items()}
        user = request.user if request.user.is_authenticated else None
        link = AffiliateService.link(
            category=program["category"], user=user, params=params,
        )
        # Defense in depth: the adapter already sanitizes, but never redirect a
        # browser to a blocked host under any circumstance.
        safe_url = sanitize_affiliate_url(link.url, program["category"])
        return HttpResponseRedirect(safe_url)
