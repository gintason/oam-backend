from rest_framework import serializers

from .models import ReferralCommissionLog


class GenerateLinkSerializer(serializers.Serializer):
    custom_slug = serializers.CharField(required=False, allow_blank=True, max_length=40)


class CommissionLogSerializer(serializers.ModelSerializer):
    referee_name = serializers.SerializerMethodField()

    class Meta:
        model = ReferralCommissionLog
        fields = ["id", "referee_name", "source_transaction_id",
                  "oam_profit_amount", "commission_amount", "created_at"]

    def get_referee_name(self, obj):
        if not obj.referee:
            return "A referral"
        return (obj.referee.first_name or obj.referee.email or "A referral")
