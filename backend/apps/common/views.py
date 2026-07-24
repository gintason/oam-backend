"""Lightweight platform-level endpoints (health + i18n discovery)."""
from django.utils.translation import gettext_lazy as _
from django.utils.translation import get_language
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .i18n import current_direction, supported_languages


class HealthView(APIView):
    """Cheap liveness probe for Render / uptime monitoring."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "oam-backend"})


class LanguagesView(APIView):
    """
    Returns the list of supported languages and the active language/direction.

    The active language is resolved by Django's LocaleMiddleware from the
    Accept-Language header (or ?lang / cookie), so the same endpoint also tells
    the client which way to lay the UI out.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "active": get_language(),
            "direction": current_direction(),
            # A translated string, proving the gettext pipeline is wired up.
            "greeting": _("Welcome to OAM Platform"),
            "languages": supported_languages(),
        })
