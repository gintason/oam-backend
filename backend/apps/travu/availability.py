"""
Bus tickets on/off switch.

Until the live provider keys arrive, BUS_TICKETS_LIVE is false and searching or
booking trips answers 503 "coming soon" — including from older app versions that
still show the booking screen. Turn on with BUS_TICKETS_LIVE=true (Render env).
Viewing past bookings and finishing a card payment already started stay open.
"""
from django.conf import settings
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission


class BusTicketsComingSoon(APIException):
    status_code = 503
    default_detail = "Bus tickets are coming soon. Please check back shortly."
    default_code = "coming_soon"


def bus_tickets_live() -> bool:
    return bool(getattr(settings, "BUS_TICKETS_LIVE", False))


class BusTicketsLive(BasePermission):
    def has_permission(self, request, view):
        if not bus_tickets_live():
            raise BusTicketsComingSoon()
        return True
