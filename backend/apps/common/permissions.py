"""Reusable DRF permissions."""
from rest_framework.permissions import BasePermission


class IsVerified(BasePermission):
    """
    Allows access only to authenticated AND verified users.

    Use on any sensitive endpoint (wallet, transfers, bookings) to enforce the
    'must verify before using' rule, while still letting unverified users hold a
    session immediately after signup.
    """
    message = "Your account is not verified. Please confirm the OTP sent to you."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_verified)
