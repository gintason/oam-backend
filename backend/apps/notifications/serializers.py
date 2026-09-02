from rest_framework import serializers

from .models import DeviceToken


class RegisterDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(
        choices=[c[0] for c in DeviceToken.Platform.choices], default="other")
