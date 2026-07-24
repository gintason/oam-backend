"""JWT helper. Tokens are issued at signup (gated until verified)."""
from rest_framework_simplejwt.tokens import RefreshToken


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    # Convenience claim so the client knows verification state without a round-trip.
    refresh["is_verified"] = user.is_verified
    return {"refresh": str(refresh), "access": str(refresh.access_token)}
