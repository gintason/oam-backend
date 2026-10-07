from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .booking import BusBookingService, fee_per_seat
from .models import BusBooking
from .serializers import BookSerializer, BusBookingSerializer, TripSearchSerializer
from .services import STATES, TravuClient, TravuError


class StatesView(APIView):
    """GET /travu/states/ — supported state strings for the dropdowns."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"states": STATES})


class TripSearchView(APIView):
    """POST /travu/trips/ {departure_state, destination_state, trip_date} -> trips."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = TripSearchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        fee = fee_per_seat()
        try:
            trips = TravuClient().check_trips(
                departure_state=s.validated_data["departure_state"],
                destination_state=s.validated_data["destination_state"],
                trip_date=s.validated_data["trip_date"],
            )
        except TravuError as exc:
            return Response({"detail": str(exc)}, status=502)
        # surface the all-in per-seat price so the UI shows the final fare
        for t in trips:
            t["service_fee_per_seat"] = float(fee)
            t["total_fare_per_seat"] = float(t.get("fare", 0)) + float(fee)
        return Response({"trips": trips, "service_fee_per_seat": float(fee)})


class BookView(APIView):
    """POST /travu/book/ — create booking + take payment (wallet or card)."""
    permission_classes = [IsVerified]

    def post(self, request):
        s = BookSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        booking = BusBookingService.create_booking(
            user=request.user,
            departure_state=d["departure_state"], destination_state=d["destination_state"],
            trip_id=d["trip_id"], order_id=d["order_id"], origin_id=d["origin_id"],
            destination_id=d["destination_id"], boarding_at=d["boarding_at"],
            provider=d["provider"], trip_date=d["trip_date"],
            amount_per_seat=d["amount_per_seat"], seat_numbers=d["seat_numbers"],
            passengers=d["passengers"], narration=d["narration"],
            departure_terminal=d["departure_terminal"], destination_terminal=d["destination_terminal"],
            vehicle_no=d["vehicle_no"],
        )

        if d["pay_with"] == "card":
            try:
                url = BusBookingService.pay_with_card(booking)
            except Exception as exc:  # noqa: BLE001
                return Response({"detail": "Couldn't start card payment.", "error": str(exc)}, status=502)
            return Response({"booking": BusBookingSerializer(booking).data,
                             "authorization_url": url, "reference": booking.payment_reference})

        # wallet
        try:
            booking = BusBookingService.pay_with_wallet(booking)
        except Exception as exc:  # insufficient funds etc.
            return Response({"detail": str(exc) or "Payment failed.",
                             "booking": BusBookingSerializer(booking).data}, status=402)
        return Response({"booking": BusBookingSerializer(booking).data})


class CardVerifyView(APIView):
    """POST /travu/card/verify/ {reference} — after returning from the gateway."""
    permission_classes = [IsVerified]

    def post(self, request):
        reference = request.data.get("reference") or ""
        try:
            booking = BusBookingService.settle_card(user=request.user, reference=reference)
        except TravuError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"booking": BusBookingSerializer(booking).data})


class BookingListView(ListAPIView):
    """GET /travu/bookings/ — the user's bus bookings."""
    permission_classes = [IsAuthenticated]
    serializer_class = BusBookingSerializer

    def get_queryset(self):
        return BusBooking.objects.filter(user=self.request.user).prefetch_related("passengers")


class BookingDetailView(RetrieveAPIView):
    """GET /travu/bookings/<reference>/ — one ticket."""
    permission_classes = [IsAuthenticated]
    serializer_class = BusBookingSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return BusBooking.objects.filter(user=self.request.user).prefetch_related("passengers")
