from rest_framework import serializers

from .models import BankAccount, WithdrawalOrder


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ("id", "bank_code", "bank_name", "account_number", "account_name",
                  "currency", "is_active", "created_at")
        read_only_fields = ("id", "account_name", "bank_name", "created_at")


class ResolveAccountSerializer(serializers.Serializer):
    bank_code = serializers.CharField(max_length=20)
    account_number = serializers.CharField(max_length=20)
    currency = serializers.CharField(max_length=3, default="NGN")


class AddBankSerializer(serializers.Serializer):
    bank_code = serializers.CharField(max_length=20)
    account_number = serializers.CharField(max_length=20)
    currency = serializers.CharField(max_length=3, default="NGN")


class WithdrawSerializer(serializers.Serializer):
    bank_account_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    currency = serializers.CharField(max_length=3, default="NGN")
    pin = serializers.CharField(max_length=6, write_only=True)

    def validate_amount(self, value):
        if value < 100:
            raise serializers.ValidationError("Minimum withdrawal is ₦100.")
        return value


class WithdrawalOrderSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="bank_account.account_name", read_only=True)
    account_number = serializers.CharField(source="bank_account.account_number", read_only=True)

    class Meta:
        model = WithdrawalOrder
        fields = ("id", "amount", "currency", "status", "reference", "provider",
                  "provider_reference", "account_name", "account_number",
                  "failure_reason", "created_at", "updated_at")
        read_only_fields = fields
