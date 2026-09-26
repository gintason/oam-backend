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


# ---- In-app notification feed ---------------------------------------------- #
from django.utils import timezone
from rest_framework.generics import ListAPIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(ListAPIView):
    """GET /notifications/ — the user's 50 most recent notifications."""
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = None  # return a plain array; the web + mobile clients read r.data directly

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]


class UnreadCountView(APIView):
    """GET /notifications/unread/ -> {"unread": N} for the red badge."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        n = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread": n})


class MarkReadView(APIView):
    """POST /notifications/read/ {ids?: [..]} — mark some (or all) as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        qs = Notification.objects.filter(user=request.user, is_read=False)
        ids = request.data.get("ids")
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True, read_at=timezone.now())
        return Response({"ok": True})
