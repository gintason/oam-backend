from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReferralNotification
from .serializers import CommissionLogSerializer, GenerateLinkSerializer
from .services import ReferralService, COMMISSION_RATE, PROFIT_THRESHOLD_NGN


def _profile_payload(profile):
    return {
        "referral_code": profile.referral_code,
        "custom_slug": profile.custom_slug,
        "link": profile.link(),
        "total_earnings": str(profile.total_earnings),
        "total_referrals_count": profile.total_referrals_count,
    }


class GenerateLinkView(APIView):
    """POST /api/v1/referrals/generate-link/ — create or rename the user's referral slug."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slug = serializer.validated_data.get("custom_slug")
        profile = (ReferralService.set_slug(request.user, slug) if slug
                   else ReferralService.ensure_profile(request.user))
        return Response(_profile_payload(profile))


class DashboardView(APIView):
    """GET /api/v1/referrals/dashboard/ — link, stats, balance, recent commissions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ReferralService.dashboard(request.user)
        # surface + clear unseen in-app notifications
        notes = list(ReferralNotification.objects.filter(user=request.user, seen=False)[:10])
        if notes:
            ReferralNotification.objects.filter(id__in=[n.id for n in notes]).update(seen=True)
        return Response({
            **_profile_payload(data["profile"]),
            "stats": {
                "total_referrals": data["total_referrals"],
                "active_referrals": data["active_referrals"],
                "total_earned": str(data["profile"].total_earnings),
            },
            "wallet_balance": str(data["wallet_balance"]),
            "commission_rate": str(COMMISSION_RATE),
            "profit_threshold": str(PROFIT_THRESHOLD_NGN),
            "recent_commissions": CommissionLogSerializer(data["logs"], many=True).data,
            "notifications": [n.message for n in notes],
        })
