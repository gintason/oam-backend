from rest_framework import serializers

from .models import BusBooking, BusPassenger


class PassengerSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, default="")
    name = serializers.CharField()
    age = serializers.CharField(required=False, allow_blank=True, default="")
    sex = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.CharField(required=False, allow_blank=True, default="")
    blood = serializers.CharField(required=False, allow_blank=True, default="")
    next_of_kin = serializers.CharField(required=False, allow_blank=True, default="")
    next_of_kin_phone = serializers.CharField(required=False, allow_blank=True, default="")
    is_primary = serializers.BooleanField(required=False, default=False)


class TripSearchSerializer(serializers.Serializer):
    departure_state = serializers.CharField()
    destination_state = serializers.CharField()
    trip_date = serializers.CharField()


class BookSerializer(serializers.Serializer):
    departure_state = serializers.CharField()
    destination_state = serializers.CharField()
    trip_id = serializers.CharField()
    order_id = serializers.CharField()
    origin_id = serializers.CharField()
    destination_id = serializers.CharField()
    boarding_at = serializers.CharField(required=False, allow_blank=True, default="")
    provider = serializers.CharField(required=False, allow_blank=True, default="")
    trip_date = serializers.CharField()
    amount_per_seat = serializers.DecimalField(max_digits=20, decimal_places=2)  # Travu FARE per seat
    seat_numbers = serializers.CharField()
    narration = serializers.CharField(required=False, allow_blank=True, default="")
    departure_terminal = serializers.CharField(required=False, allow_blank=True, default="")
    destination_terminal = serializers.CharField(required=False, allow_blank=True, default="")
    vehicle_no = serializers.CharField(required=False, allow_blank=True, default="")
    passengers = PassengerSerializer(many=True)
    pay_with = serializers.ChoiceField(choices=["wallet", "card"], default="wallet")

    def validate(self, data):
        seats = [x for x in str(data["seat_numbers"]).split(",") if x.strip()]
        if not seats:
            raise serializers.ValidationError("Select at least one seat.")
        if len(data["passengers"]) != len(seats):
            raise serializers.ValidationError("The number of passengers must match the number of seats.")
        if not any(p.get("is_primary") for p in data["passengers"]):
            data["passengers"][0]["is_primary"] = True
        return data


class BusPassengerOutSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusPassenger
        fields = ["title", "name", "age", "sex", "phone", "email", "blood",
                  "next_of_kin", "next_of_kin_phone", "is_primary", "seat_number"]


class BusBookingSerializer(serializers.ModelSerializer):
    passengers = BusPassengerOutSerializer(many=True, read_only=True)
    fare_total = serializers.SerializerMethodField()
    fee_total = serializers.SerializerMethodField()

    class Meta:
        model = BusBooking
        fields = [
            "reference", "status", "departure_state", "destination_state",
            "trip_date", "narration", "departure_terminal", "destination_terminal",
            "vehicle_no", "provider", "seat_numbers", "total_seats",
            "amount_per_seat", "fare_total", "fee_total", "total_amount", "currency",
            "travu_order_id", "travu_order_number", "failure_reason",
            "passengers", "created_at",
        ]
        read_only_fields = fields

    def get_fare_total(self, obj):
        return str(obj.amount_per_seat * obj.total_seats)

    def get_fee_total(self, obj):
        return str(obj.total_amount - (obj.amount_per_seat * obj.total_seats))
