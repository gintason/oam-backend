from rest_framework import serializers

from .models import Biller, BillOrder


class BillerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Biller
        fields = ("id", "country", "category", "code", "name")


class PurchaseSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=Biller.Category.choices)
    code = serializers.CharField(max_length=40)          # biller code, e.g. "MTN"
    recipient = serializers.CharField(max_length=64)
    amount = serializers.DecimalField(max_digits=20, decimal_places=4, required=False)
    currency = serializers.CharField(max_length=3, default="NGN")
    country = serializers.CharField(max_length=2, default="NG")
    plan_code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    variation_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    verification_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    meter_type = serializers.CharField(max_length=16, required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value


class BillOrderSerializer(serializers.ModelSerializer):
    biller_name = serializers.CharField(source="biller.name", read_only=True)

    class Meta:
        model = BillOrder
        fields = ("id", "category", "biller_name", "recipient", "amount", "cost_amount",
                  "revenue_amount", "currency", "pay_with", "status", "reference",
                  "provider", "provider_reference", "customer_name", "meter_type",
                  "token", "units", "created_at", "updated_at")
        read_only_fields = fields
