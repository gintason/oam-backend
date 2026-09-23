from rest_framework import serializers

from .models import DeviceToken, Notification


class RegisterDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(
        choices=[c[0] for c in DeviceToken.Platform.choices], default="other")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "kind", "title", "body", "data", "is_read", "created_at")
