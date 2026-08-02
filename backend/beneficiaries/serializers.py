from rest_framework import serializers

from .models import Beneficiary


class BeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Beneficiary
        fields = [
            "id",
            "service_type",
            "account_identifier",
            "biller_code",
            "biller_name",
            "customer_name",
            "label",
            "last_used_at",
        ]
        # Identity fields are set on create and never edited afterwards; only
        # the nickname is user-editable via PATCH.
        read_only_fields = ["id", "last_used_at"]

    def validate_service_type(self, value):
        if value not in Beneficiary.Service.values:
            raise serializers.ValidationError("Unknown service type.")
        return value

    def validate_account_identifier(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("An account identifier is required.")
        return value
