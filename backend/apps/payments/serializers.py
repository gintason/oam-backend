from rest_framework import serializers
from decimal import Decimal

from .models import ServiceTransaction


class FundInitSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=20, decimal_places=4, min_value=Decimal("1"))
    currency = serializers.CharField(max_length=3)


class ServiceTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceTransaction
        fields = ("id", "service_type", "provider", "status", "amount", "currency",
                  "internal_reference", "provider_reference", "created_at", "updated_at")
        read_only_fields = fields
