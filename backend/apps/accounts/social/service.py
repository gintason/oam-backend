"""
Social auth orchestration: verify the provider token, then link-or-create the
user (link-by-email is the current policy) and return the user.
"""
from __future__ import annotations

from django.conf import settings
from django.db import transaction

from ..models import SocialAccount, User
from .apple import AppleVerifier
from .exceptions import SocialAuthError
from .facebook import FacebookVerifier
from .google import GoogleVerifier
from .mock import MockVerifier

VERIFIERS = {
    "google": GoogleVerifier,
    "facebook": FacebookVerifier,
    "apple": AppleVerifier,
}


def _get_verifier(provider: str, token: str):
    if provider not in VERIFIERS:
        raise SocialAuthError(f"Unsupported social provider '{provider}'.")
    if (getattr(settings, "DEBUG", False)
            and getattr(settings, "SOCIAL_AUTH_ALLOW_MOCK", False)
            and token == "MOCK"):
        return MockVerifier(provider)
    return VERIFIERS[provider]()


@transaction.atomic
def authenticate_social(provider: str, token: str, data: dict | None = None):
    """Returns (user, created)."""
    profile = _get_verifier(provider, token).verify(token, data)

    # 1) Already-linked identity -> straight login.
    link = (SocialAccount.objects
            .select_related("user")
            .filter(provider=provider, provider_user_id=profile.provider_user_id)
            .first())
    if link:
        return link.user, False

    # 2) Link by email to an existing account (current policy).
    user = User.objects.filter(email__iexact=profile.email).first() if profile.email else None
    created = False
    if user is None:
        if not profile.email:
            raise SocialAuthError("This provider returned no email, so we can't create an account.")
        user = User.objects.create_user(
            email=profile.email, password=None,
            first_name=profile.first_name or "", last_name=profile.last_name or "",
            auth_provider=provider, is_verified=True,
        )
        created = True
    elif not user.is_verified:
        user.is_verified = True
        user.save(update_fields=["is_verified", "updated_at"])

    SocialAccount.objects.create(
        user=user, provider=provider,
        provider_user_id=profile.provider_user_id, email=profile.email or "",
    )
    return user, created
