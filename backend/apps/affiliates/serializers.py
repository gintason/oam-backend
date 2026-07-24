from rest_framework import serializers


class TravelLinkRequestSerializer(serializers.Serializer):
    params = serializers.DictField(required=False, child=serializers.CharField(allow_blank=True))
