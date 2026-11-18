from rest_framework import serializers

from .models import Biller, BillOrder


class BillerSerializer(serializers.ModelSerializer):
    service_fee = serializers.SerializerMethodField()

    class Meta:
        model = Biller
        fields = ("id", "country", "category", "code", "name", "service_fee")

    def get_service_fee(self, obj):
        from .services import service_fee
        return str(service_fee(obj.category))


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
    quantity = serializers.IntegerField(required=False, min_value=1, max_value=5)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value


def _payload_value(order, key):
    """Find `key` (pins / epin_cards) in the provider payload we stored, newest first."""
    rp = order.response_payload or {}
    for src in (rp.get("resolve") or {}, rp):
        if isinstance(src, dict):
            v = (src.get("data") or {}).get(key) if isinstance(src.get("data"), dict) else None
            if v:
                return v
    return []


class BillOrderSerializer(serializers.ModelSerializer):
    biller_name = serializers.CharField(source="biller.name", read_only=True)
    pins = serializers.SerializerMethodField()
    epin_cards = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()

    # Order lists leave out the (large) ePIN card images; detail/purchase replies include them.
    with_images = True

    class Meta:
        model = BillOrder
        fields = ("id", "category", "biller_name", "recipient", "amount", "cost_amount",
                  "revenue_amount", "currency", "pay_with", "status", "reference",
                  "provider", "provider_reference", "customer_name", "meter_type",
                  "token", "units", "pins", "epin_cards", "quantity", "plan_name",
                  "created_at", "updated_at")
        read_only_fields = fields

    def get_pins(self, obj):
        if obj.category != "education" or str(obj.status) != "success":
            return []
        return _payload_value(obj, "pins")

    def get_epin_cards(self, obj):
        if obj.category != "epin" or str(obj.status) != "success":
            return []
        cards = []
        for c in _payload_value(obj, "epin_cards") or []:
            if not isinstance(c, dict):
                continue
            card = {k: c.get(k) for k in ("id", "network", "denomination", "pieces_count")}
            if self.with_images:
                img = str(c.get("image_url") or "")
                card["image_url"] = img if img.startswith("data:image/") else ""
            cards.append(card)
        return cards

    def get_quantity(self, obj):
        return int((obj.metadata or {}).get("quantity") or 1)

    def get_plan_name(self, obj):
        return (obj.metadata or {}).get("plan_name", "")


class BillOrderListSerializer(BillOrderSerializer):
    with_images = False
