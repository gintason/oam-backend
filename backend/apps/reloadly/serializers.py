from rest_framework import serializers

from .models import AirtimeTopup


class QuoteSerializer(serializers.Serializer):
    operator_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    use_local_amount = serializers.BooleanField(default=False)


class BuySerializer(serializers.Serializer):
    operator_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    use_local_amount = serializers.BooleanField(default=False)
    recipient_number = serializers.CharField()
    recipient_iso2 = serializers.CharField()
    pay_with = serializers.ChoiceField(choices=["wallet", "card"], default="wallet")


class AirtimeTopupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AirtimeTopup
        fields = ["reference", "status", "operator_name", "country_iso",
                  "recipient_number", "recipient_iso2", "amount", "currency",
                  "total_ngn", "markup_ngn", "reloadly_transaction_id",
                  "delivered_amount", "delivered_currency", "failure_reason", "created_at"]
        read_only_fields = fields
