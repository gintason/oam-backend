from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken
from .serializers import RegisterDeviceSerializer


class RegisterDeviceView(APIView):
    """POST /notifications/register-device/ {token, platform} — idempotent upsert."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = RegisterDeviceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data["token"]
        platform = s.validated_data["platform"]
        # A token belongs to whichever account most recently registered it.
        DeviceToken.objects.update_or_create(
            token=token,
            defaults={"user": request.user, "platform": platform, "is_active": True},
        )
        return Response({"ok": True})


class UnregisterDeviceView(APIView):
    """POST /notifications/unregister-device/ {token} — on logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        if token:
            DeviceToken.objects.filter(user=request.user, token=token).update(is_active=False)
        return Response({"ok": True})
