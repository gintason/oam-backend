"""Upload endpoints: hand out signed tickets, and report what the rules are."""
from __future__ import annotations

from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .cloudinary_client import UploadConfigError, build_ticket
from .purposes import ADMIN_ONLY, PURPOSES


class UploadTicketView(APIView):
    """
    POST /uploads/ticket/  {"purpose": "artisan_work_video"}

    Returns everything the browser needs to upload one file directly to
    Cloudinary. The signature covers the destination folder, so a ticket can't
    be redirected somewhere it wasn't meant for.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        key = (request.data.get("purpose") or "").strip()
        purpose = PURPOSES.get(key)
        if purpose is None:
            return Response(
                {"detail": "Unknown upload purpose."}, status=http.HTTP_400_BAD_REQUEST
            )

        if key in ADMIN_ONLY and not request.user.is_staff:
            return Response(
                {"detail": "Not available on your account."}, status=http.HTTP_403_FORBIDDEN
            )

        try:
            ticket = build_ticket(
                folder=purpose.folder,
                resource_type=purpose.resource_type,
                delivery_type=purpose.delivery_type,
                max_bytes=purpose.max_bytes,
                allowed_formats=purpose.allowed_formats,
            )
        except UploadConfigError as exc:
            # Surfaced plainly: a missing env var here looks like a broken
            # upload button, and that's a miserable thing to debug from the UI.
            return Response({"detail": str(exc)}, status=http.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({
            "cloud_name": ticket.cloud_name,
            "api_key": ticket.api_key,
            "timestamp": ticket.timestamp,
            "signature": ticket.signature,
            "folder": ticket.folder,
            "resource_type": ticket.resource_type,
            "type": ticket.delivery_type,
            "upload_url": ticket.upload_url,
            "max_bytes": ticket.max_bytes,
            "allowed_formats": ticket.allowed_formats,
        })


class UploadRulesView(APIView):
    """
    GET /uploads/rules/ — limits per purpose, so the browser can reject an
    oversized file before starting a slow upload rather than after it.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            key: {
                "label": p.label,
                "hint": p.hint,
                "resource_type": p.resource_type,
                "max_bytes": p.max_bytes,
                "allowed_formats": p.allowed_formats,
                "min_width": p.min_width,
                "min_height": p.min_height,
                "min_duration": p.min_duration,
                "max_duration": p.max_duration,
                "admin_only": key in ADMIN_ONLY,
            }
            for key, p in PURPOSES.items()
        })
