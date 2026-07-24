from rest_framework import serializers

from .models import Wallet


class WalletSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(source="cached_balance", max_digits=20, decimal_places=4, read_only=True)

    class Meta:
        model = Wallet
        fields = ("id", "currency", "balance", "updated_at")


class TransactionSerializer(serializers.Serializer):
    """A single posting against the wallet's ledger account (a statement line)."""
    id = serializers.UUIDField()
    direction = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    currency = serializers.CharField()
    description = serializers.CharField(source="journal.description")
    reference = serializers.CharField(source="journal.reference")
    created_at = serializers.DateTimeField()


class OpenWalletSerializer(serializers.Serializer):
    currency = serializers.CharField(max_length=3)
