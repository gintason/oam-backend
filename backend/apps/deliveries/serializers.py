from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import (
    DeliveryEvent,
    DeliveryRequest,
    DeliveryStatus,
    DeliveryZone,
    DispatchOffer,
    DispatchSettings,
    PackageCategory,
    RiderDocument,
    RiderProfile,
    SurgePricing,
    VehicleType,
)

LAT = {"max_digits": 9, "decimal_places": 6, "min_value": Decimal("-90"), "max_value": Decimal("90")}
LNG = {"max_digits": 9, "decimal_places": 6, "min_value": Decimal("-180"), "max_value": Decimal("180")}


def _coord(value):
    """Accept any float precision from map pickers; store 6 dp."""
    return Decimal(str(round(float(value), 6)))


class CoordField(serializers.DecimalField):
    def to_internal_value(self, data):
        try:
            data = _coord(data)
        except (TypeError, ValueError):
            self.fail("invalid")
        return super().to_internal_value(data)


# --------------------------------------------------------------------------- #
# Customer
# --------------------------------------------------------------------------- #

class QuoteInputSerializer(serializers.Serializer):
    pickup_lat = CoordField(**LAT)
    pickup_lng = CoordField(**LNG)
    dropoff_lat = CoordField(**LAT)
    dropoff_lng = CoordField(**LNG)
    weight_kg = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0"),
                                         max_value=Decimal("200"), required=False, default=Decimal("1"))
    package_category = serializers.ChoiceField(choices=PackageCategory.choices, required=False,
                                               default=PackageCategory.SMALL)


class CreateDeliverySerializer(QuoteInputSerializer):
    pickup_address = serializers.CharField(max_length=255)
    pickup_contact_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    pickup_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    pickup_note = serializers.CharField(max_length=255, required=False, allow_blank=True)
    dropoff_address = serializers.CharField(max_length=255)
    recipient_name = serializers.CharField(max_length=120)
    recipient_phone = serializers.RegexField(r"^\+?[0-9 ()-]{7,20}$", max_length=20,
                                             error_messages={"invalid": "Enter a valid phone number."})
    dropoff_note = serializers.CharField(max_length=255, required=False, allow_blank=True)
    package_description = serializers.CharField(max_length=255)
    payment_method = serializers.ChoiceField(choices=DeliveryRequest.PaymentMethod.choices,
                                             required=False, default=DeliveryRequest.PaymentMethod.WALLET)
    expected_fee = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    return_url = serializers.CharField(max_length=500, required=False, allow_blank=True)


class DeliveryEventSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DeliveryEvent
        fields = ["status", "status_label", "note", "actor", "lat", "lng", "created_at"]


class RiderPublicSerializer(serializers.ModelSerializer):
    vehicle_label = serializers.CharField(source="get_vehicle_type_display", read_only=True)

    class Meta:
        model = RiderProfile
        fields = ["id", "full_name", "phone", "photo_url", "vehicle_type", "vehicle_label",
                  "vehicle_plate", "vehicle_description", "rating_avg", "rating_count",
                  "completed_deliveries", "lat", "lng", "location_updated_at"]


DELIVERY_LIST_FIELDS = [
    "id", "reference", "status", "status_label", "payment_status", "payment_method",
    "pickup_address", "dropoff_address", "recipient_name", "package_category",
    "package_description", "distance_km", "fee", "currency", "created_at", "delivered_at",
    "rider_name", "rating",
]


class DeliveryListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    rider_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryRequest
        fields = DELIVERY_LIST_FIELDS

    def get_rider_name(self, obj):
        return obj.rider.full_name if obj.rider_id else ""


class DeliveryDetailSerializer(serializers.ModelSerializer):
    """Customer view: everything incl. the delivery code (they share it)."""
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    category_label = serializers.CharField(source="get_package_category_display", read_only=True)
    rider = RiderPublicSerializer(read_only=True)
    events = DeliveryEventSerializer(many=True, read_only=True)
    zone_name = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    can_rate = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryRequest
        fields = [
            "id", "reference", "status", "status_label", "payment_status", "payment_method",
            "payment_url", "pickup_address", "pickup_lat", "pickup_lng", "pickup_contact_name",
            "pickup_contact_phone", "pickup_note", "dropoff_address", "dropoff_lat", "dropoff_lng",
            "recipient_name", "recipient_phone", "dropoff_note", "package_description",
            "package_category", "category_label", "weight_kg", "distance_km", "duration_min",
            "zone_name", "base_fare", "distance_fare", "weight_fare", "zone_multiplier",
            "category_multiplier", "surge_multiplier", "fee", "currency", "delivery_code",
            "proof_photo_url", "dispatch_round", "dispatch_exhausted", "rider", "events",
            "accepted_at", "picked_up_at", "in_transit_at", "delivered_at", "cancelled_at",
            "cancel_reason", "cancelled_by", "rating", "review", "created_at",
            "can_cancel", "can_rate",
        ]

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone_id else ""

    def get_can_cancel(self, obj):
        return obj.status in (DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED)

    def get_can_rate(self, obj):
        return obj.status == DeliveryStatus.DELIVERED and not obj.rating and bool(obj.rider_id)


class RiderDeliverySerializer(serializers.ModelSerializer):
    """Rider view: no delivery code, no customer money breakdown beyond the payout."""
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    category_label = serializers.CharField(source="get_package_category_display", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    events = DeliveryEventSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryRequest
        fields = [
            "id", "reference", "status", "status_label", "pickup_address", "pickup_lat",
            "pickup_lng", "pickup_contact_name", "pickup_contact_phone", "pickup_note",
            "dropoff_address", "dropoff_lat", "dropoff_lng", "recipient_name", "recipient_phone",
            "dropoff_note", "package_description", "package_category", "category_label",
            "weight_kg", "distance_km", "duration_min", "rider_payout", "currency",
            "customer_name", "customer_phone", "accepted_at", "picked_up_at", "in_transit_at",
            "delivered_at", "cancelled_at", "rating", "events", "created_at",
        ]

    def get_customer_name(self, obj):
        u = obj.customer
        return f"{u.first_name} {u.last_name}".strip() or "Customer"

    def get_customer_phone(self, obj):
        return obj.pickup_contact_phone or (obj.customer.phone or "")


class RateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(max_length=300, required=False, allow_blank=True)


class CancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True)


# --------------------------------------------------------------------------- #
# Rider
# --------------------------------------------------------------------------- #

class RiderDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = RiderDocument
        fields = ["id", "kind", "kind_label", "url", "note", "created_at"]
        read_only_fields = ["id", "created_at"]


class RiderProfileSerializer(serializers.ModelSerializer):
    documents = RiderDocumentSerializer(many=True, read_only=True)
    vehicle_label = serializers.CharField(source="get_vehicle_type_display", read_only=True)
    verification_label = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = RiderProfile
        fields = [
            "id", "full_name", "phone", "city", "photo_url", "vehicle_type", "vehicle_label",
            "vehicle_plate", "vehicle_description", "verification_status", "verification_label",
            "review_note", "reviewed_at", "availability", "lat", "lng", "location_updated_at",
            "total_earnings", "completed_deliveries", "rating_avg", "rating_count", "documents",
            "created_at",
        ]
        read_only_fields = [f for f in fields if f not in (
            "full_name", "phone", "city", "photo_url", "vehicle_type", "vehicle_plate",
            "vehicle_description")]


class RiderApplySerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^\+?[0-9 ()-]{7,20}$", max_length=20)
    city = serializers.CharField(max_length=80, required=False, allow_blank=True)
    photo_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    vehicle_type = serializers.ChoiceField(choices=VehicleType.choices)
    vehicle_plate = serializers.CharField(max_length=20, required=False, allow_blank=True)
    vehicle_description = serializers.CharField(max_length=80, required=False, allow_blank=True)
    documents = RiderDocumentSerializer(many=True, required=False)

    def validate(self, attrs):
        docs = attrs.get("documents") or []
        kinds = {d["kind"] for d in docs}
        if RiderDocument.Kind.ID_CARD not in kinds:
            raise serializers.ValidationError({"documents": "Upload a government ID."})
        if attrs["vehicle_type"] != VehicleType.BICYCLE:
            if not attrs.get("vehicle_plate"):
                raise serializers.ValidationError({"vehicle_plate": "Enter your plate number."})
            if RiderDocument.Kind.LICENSE not in kinds:
                raise serializers.ValidationError({"documents": "Upload your rider's/driver's licence."})
        return attrs


class AvailabilitySerializer(serializers.Serializer):
    online = serializers.BooleanField()
    lat = CoordField(**LAT, required=False)
    lng = CoordField(**LNG, required=False)


class LocationSerializer(serializers.Serializer):
    lat = CoordField(**LAT)
    lng = CoordField(**LNG)


class RiderActionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=4, required=False, allow_blank=True)
    photo_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True)
    lat = CoordField(**LAT, required=False)
    lng = CoordField(**LNG, required=False)


class OfferSerializer(serializers.ModelSerializer):
    delivery = RiderDeliverySerializer(read_only=True)
    seconds_left = serializers.SerializerMethodField()

    class Meta:
        model = DispatchOffer
        fields = ["id", "round", "distance_km", "status", "expires_at", "seconds_left", "delivery"]

    def get_seconds_left(self, obj):
        from django.utils import timezone
        return max(0, int((obj.expires_at - timezone.now()).total_seconds()))


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #

class AdminRiderSerializer(RiderProfileSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    active_delivery = serializers.SerializerMethodField()

    class Meta(RiderProfileSerializer.Meta):
        fields = RiderProfileSerializer.Meta.fields + ["email", "active_delivery"]
        read_only_fields = fields

    def get_active_delivery(self, obj):
        from .models import ACTIVE_STATUSES
        d = obj.deliveries.filter(status__in=ACTIVE_STATUSES).only("id", "reference").first()
        return {"id": str(d.id), "reference": d.reference} if d else None


class RiderReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "suspend", "reinstate"])
    note = serializers.CharField(max_length=300, required=False, allow_blank=True)


class AdminDeliverySerializer(DeliveryDetailSerializer):
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    customer_name = serializers.SerializerMethodField()
    offers = serializers.SerializerMethodField()

    class Meta(DeliveryDetailSerializer.Meta):
        fields = DeliveryDetailSerializer.Meta.fields + [
            "customer_email", "customer_name", "rider_payout", "platform_fee", "offers",
            "payment_reference"]

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip()

    def get_offers(self, obj):
        return [{"rider": o.rider.full_name, "round": o.round, "distance_km": o.distance_km,
                 "status": o.status, "created_at": o.created_at}
                for o in obj.offers.select_related("rider").all()[:30]]


class AdminDeliveryListSerializer(DeliveryListSerializer):
    customer_email = serializers.CharField(source="customer.email", read_only=True)

    class Meta(DeliveryListSerializer.Meta):
        fields = DELIVERY_LIST_FIELDS + ["customer_email", "platform_fee", "rider_payout",
                                         "dispatch_round", "dispatch_exhausted", "pickup_lat",
                                         "pickup_lng", "dropoff_lat", "dropoff_lng"]


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ["id", "name", "city", "center_lat", "center_lng", "radius_km", "base_fare",
                  "per_km", "per_kg", "min_fare", "zone_multiplier", "currency", "is_active",
                  "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        for k in ("radius_km", "base_fare", "per_km", "min_fare"):
            if k in attrs and attrs[k] < 0:
                raise serializers.ValidationError({k: "Must be zero or more."})
        if "zone_multiplier" in attrs and not Decimal("0.5") <= attrs["zone_multiplier"] <= Decimal("5"):
            raise serializers.ValidationError({"zone_multiplier": "Between 0.5 and 5."})
        return attrs


class SurgePricingSerializer(serializers.ModelSerializer):
    zone_name = serializers.SerializerMethodField()
    is_live = serializers.SerializerMethodField()

    class Meta:
        model = SurgePricing
        fields = ["id", "zone", "zone_name", "multiplier", "reason", "starts_at", "ends_at",
                  "is_active", "is_live", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone_id else "All areas"

    def get_is_live(self, obj):
        from django.utils import timezone
        now = timezone.now()
        return obj.is_active and obj.starts_at <= now and (obj.ends_at is None or obj.ends_at > now)

    def validate(self, attrs):
        m = attrs.get("multiplier")
        if m is not None and not Decimal("1") <= m <= Decimal("5"):
            raise serializers.ValidationError({"multiplier": "Between 1.0 and 5.0."})
        s, e = attrs.get("starts_at"), attrs.get("ends_at")
        if s and e and e <= s:
            raise serializers.ValidationError({"ends_at": "Must be after the start."})
        return attrs


class DispatchSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispatchSettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def validate(self, attrs):
        if "max_rounds" in attrs and not 1 <= attrs["max_rounds"] <= 10:
            raise serializers.ValidationError({"max_rounds": "Between 1 and 10."})
        if "offer_batch" in attrs and not 1 <= attrs["offer_batch"] <= 10:
            raise serializers.ValidationError({"offer_batch": "Between 1 and 10."})
        if "offer_timeout_s" in attrs and not 15 <= attrs["offer_timeout_s"] <= 300:
            raise serializers.ValidationError({"offer_timeout_s": "Between 15 and 300 seconds."})
        if "max_surge" in attrs and not Decimal("1") <= attrs["max_surge"] <= Decimal("5"):
            raise serializers.ValidationError({"max_surge": "Between 1.0 and 5.0."})
        if "road_factor" in attrs and not Decimal("1") <= attrs["road_factor"] <= Decimal("2"):
            raise serializers.ValidationError({"road_factor": "Between 1.0 and 2.0."})
        return attrs
