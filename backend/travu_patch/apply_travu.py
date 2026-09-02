#!/usr/bin/env python3
"""
Travu bus booking — full backend (booking service, API, migration, wiring).

Builds on the foundation (apps/travu/services.py + models.py). Adds:
  * booking.py  — BusBookingService: quote, create_booking, pay_with_wallet,
    pay_with_card (+ settle_card), and _fulfill (calls Travu book_trip, then
    captures fare->Travu / fee->OAM revenue, or refunds on failure).
  * serializers.py, views.py, urls.py, admin.py, migration.
  * settings: INSTALLED_APPS += apps.travu, BUS_FEE_PER_SEAT (env, default ₦500).
  * config/urls: /api/v1/travu/.

Payment: wallet OR card (Paystack via FundingService). Convenience fee is
₦500/seat by default, override with env BUS_FEE_PER_SEAT.

RUN FROM BACKEND ROOT:
    python3 travu_patch/apply_travu.py
    python manage.py migrate
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


def write(path, content):
    full = _p(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(content)
    print(f"  + wrote {path}")


def edit(path, subs):
    full = _p(path)
    if not os.path.exists(full):
        sys.exit(f"ABORT: expected file not found: {path}")
    s = open(full, encoding="utf-8").read()
    for old, new in subs:
        if new in s:
            print(f"  = {path}: already applied, skipping one edit")
            continue
        if s.count(old) != 1:
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:150]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


if not os.path.exists(_p("apps/travu/services.py")):
    sys.exit("ABORT: apps/travu/services.py not found — apply the Travu foundation zip first.")

# ------------------------------------------------------------- booking.py
write("apps/travu/booking.py", '''"""
Bus booking orchestration: money in (wallet or card) -> Travu book_trip ->
capture (fare to Travu, fee to OAM revenue) or refund on failure.
"""
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.wallet.services import WalletService, REVENUE_ACCOUNT
from apps.payments.services import FundingService

from .services import TravuClient, TravuError, s as _s
from .models import BusBooking, BusPassenger, TravuApiLog

logger = logging.getLogger(__name__)

TRAVU_ACCOUNT = "provider:travu"   # OAM's cost of fares paid to Travu


def fee_per_seat() -> Decimal:
    """Convenience fee per seat (OAM revenue). Env BUS_FEE_PER_SEAT, default ₦500."""
    val = getattr(settings, "BUS_FEE_PER_SEAT", None)
    try:
        return Decimal(str(val)) if val not in (None, "") else Decimal("500")
    except Exception:
        return Decimal("500")


def _ref() -> str:
    return f"BUS-{uuid.uuid4().hex[:20]}"


class BusBookingService:
    @staticmethod
    def quote(fare_per_seat, seats: int) -> dict:
        fare = Decimal(str(fare_per_seat or 0))
        fee = fee_per_seat()
        n = int(seats or 0)
        fare_total = fare * n
        fee_total = fee * n
        return {
            "fare_per_seat": fare, "fee_per_seat": fee, "seats": n,
            "fare_total": fare_total, "fee_total": fee_total,
            "total": fare_total + fee_total,
        }

    @staticmethod
    @transaction.atomic
    def create_booking(*, user, departure_state, destination_state, trip_id, order_id,
                       origin_id, destination_id, boarding_at, provider, trip_date,
                       amount_per_seat, seat_numbers, passengers, currency="NGN",
                       narration="", departure_terminal="", destination_terminal="",
                       vehicle_no="") -> BusBooking:
        seats = [x.strip() for x in str(seat_numbers).split(",") if x.strip()]
        q = BusBookingService.quote(amount_per_seat, len(seats))
        booking = BusBooking.objects.create(
            user=user, reference=_ref(), status=BusBooking.Status.PENDING,
            departure_state=_s(departure_state), destination_state=_s(destination_state),
            trip_id=_s(trip_id), order_id=_s(order_id), origin_id=_s(origin_id),
            destination_id=_s(destination_id), boarding_at=_s(boarding_at),
            provider=_s(provider), trip_date=_s(trip_date), narration=_s(narration),
            departure_terminal=_s(departure_terminal), destination_terminal=_s(destination_terminal),
            vehicle_no=_s(vehicle_no), seat_numbers=",".join(seats), total_seats=len(seats),
            amount_per_seat=q["fare_per_seat"], total_amount=q["total"], currency=currency.upper(),
            agent_email=getattr(settings, "TRAVU_AGENT_EMAIL", "") or "",
        )
        for idx, p in enumerate(passengers):
            BusPassenger.objects.create(
                booking=booking, title=_s(p.get("title")), name=_s(p.get("name")),
                age=_s(p.get("age")), sex=_s(p.get("sex")), phone=_s(p.get("phone")),
                email=_s(p.get("email")), blood=_s(p.get("blood")),
                next_of_kin=_s(p.get("next_of_kin")), next_of_kin_phone=_s(p.get("next_of_kin_phone")),
                is_primary=bool(p.get("is_primary")) or idx == 0,
                seat_number=seats[idx] if idx < len(seats) else "",
            )
        return booking

    # ---------------- payment entry points ----------------
    @staticmethod
    def pay_with_wallet(booking: BusBooking) -> BusBooking:
        wallet = WalletService.get_or_create_wallet(booking.user, booking.currency)
        WalletService.hold(wallet, booking.total_amount, reference=booking.reference,
                           description=f"Bus booking hold {booking.reference}",
                           metadata={"bus": str(booking.id)})
        return BusBookingService._fulfill(booking)

    @staticmethod
    def pay_with_card(booking: BusBooking) -> str:
        """Charge the card for the full total; the wallet is funded on success."""
        txn, init = FundingService.initialize(booking.user, booking.total_amount, booking.currency)
        booking.payment_reference = txn.internal_reference
        booking.save(update_fields=["payment_reference", "updated_at"])
        return init.authorization_url

    @staticmethod
    def settle_card(*, user, reference: str) -> BusBooking:
        """Called after the user returns from the gateway (or via webhook)."""
        booking = BusBooking.objects.filter(payment_reference=reference, user=user).first()
        if booking is None:
            raise TravuError("Unknown booking reference.")
        if booking.status != BusBooking.Status.PENDING:
            return booking  # already fulfilled/failed — idempotent
        FundingService.settle(reference)  # verify + credit wallet (idempotent)
        wallet = WalletService.get_or_create_wallet(booking.user, booking.currency)
        WalletService.hold(wallet, booking.total_amount, reference=booking.reference,
                           description=f"Bus booking hold {booking.reference}",
                           metadata={"bus": str(booking.id)})
        return BusBookingService._fulfill(booking)

    # ---------------- core: book at Travu, capture or refund ----------------
    @staticmethod
    def _fulfill(booking: BusBooking) -> BusBooking:
        booking.status = BusBooking.Status.PAID
        booking.save(update_fields=["status", "updated_at"])
        wallet = WalletService.get_or_create_wallet(booking.user, booking.currency)

        passengers = [
            {
                "title": p.title, "name": p.name, "age": p.age, "sex": p.sex,
                "phone": p.phone, "email": p.email, "blood": p.blood,
                "next_of_kin": p.next_of_kin, "next_of_kin_phone": p.next_of_kin_phone,
                "is_primary": p.is_primary,
            }
            for p in booking.passengers.all()
        ]

        client = TravuClient()
        try:
            result = client.book_trip(
                seat_numbers=booking.seat_numbers,
                amount_per_seat=str(booking.amount_per_seat),   # FARE only — Travu's price
                passengers=passengers,
                origin_id=booking.origin_id, destination_id=booking.destination_id,
                boarding_at=booking.boarding_at, trip_id=booking.trip_id,
                trip_date=booking.trip_date, order_id=booking.order_id,
                provider=booking.provider, agent_email=booking.agent_email,
            )
        except TravuError as exc:
            TravuApiLog.objects.create(booking=booking, endpoint="book_trip", ok=False,
                                       error=str(exc)[:255])
            return BusBookingService._refund(booking, wallet, str(exc)[:255])

        TravuApiLog.objects.create(booking=booking, endpoint="book_trip", ok=True,
                                   response_payload=result.get("raw", {}))

        status_ = (result.get("order_status") or "").lower()
        if status_ == "confirmed" or _s(result.get("order_id")):
            fare_total = booking.amount_per_seat * booking.total_seats
            WalletService.capture(
                booking.currency, booking.total_amount, reference=booking.reference,
                cost=fare_total, counterpart_code=TRAVU_ACCOUNT,
                description=f"Bus booking {booking.reference}",
                metadata={"bus": str(booking.id), "fee": str(booking.total_amount - fare_total)},
            )
            booking.status = BusBooking.Status.CONFIRMED
            booking.travu_order_id = _s(result.get("order_id"))
            booking.travu_order_number = _s(result.get("order_number"))
            booking.vehicle_no = _s(result.get("vehicle_no")) or booking.vehicle_no
            booking.narration = _s(result.get("narration")) or booking.narration
            booking.response_payload = result.get("raw", {})
            booking.save(update_fields=["status", "travu_order_id", "travu_order_number",
                                        "vehicle_no", "narration", "response_payload", "updated_at"])
            return booking

        return BusBookingService._refund(booking, wallet, "Booking not confirmed by provider.")

    @staticmethod
    def _refund(booking: BusBooking, wallet, reason: str) -> BusBooking:
        WalletService.release(wallet, booking.total_amount, reference=booking.reference,
                              description=f"Bus refund {booking.reference}",
                              metadata={"bus": str(booking.id)})
        booking.status = BusBooking.Status.FAILED
        booking.failure_reason = reason
        booking.save(update_fields=["status", "failure_reason", "updated_at"])
        return booking
''')

# ------------------------------------------------------------- serializers.py
write("apps/travu/serializers.py", '''from rest_framework import serializers

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
''')

# ------------------------------------------------------------- views.py
write("apps/travu/views.py", '''from rest_framework.generics import ListAPIView, RetrieveAPIView
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
''')

# ------------------------------------------------------------- urls.py
write("apps/travu/urls.py", '''from django.urls import path

from .views import (BookingDetailView, BookingListView, BookView, CardVerifyView,
                    StatesView, TripSearchView)

urlpatterns = [
    path("states/", StatesView.as_view(), name="travu-states"),
    path("trips/", TripSearchView.as_view(), name="travu-trips"),
    path("book/", BookView.as_view(), name="travu-book"),
    path("card/verify/", CardVerifyView.as_view(), name="travu-card-verify"),
    path("bookings/", BookingListView.as_view(), name="travu-bookings"),
    path("bookings/<str:reference>/", BookingDetailView.as_view(), name="travu-booking-detail"),
]
''')

# ------------------------------------------------------------- admin.py
write("apps/travu/admin.py", '''from django.contrib import admin

from .models import BusBooking, BusPassenger, TravuApiLog


class PassengerInline(admin.TabularInline):
    model = BusPassenger
    extra = 0


@admin.register(BusBooking)
class BusBookingAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "departure_state", "destination_state",
                    "total_seats", "total_amount", "status", "created_at")
    list_filter = ("status", "provider")
    search_fields = ("reference", "travu_order_id", "user__email")
    inlines = [PassengerInline]


admin.site.register(TravuApiLog)
''')

# ------------------------------------------------------------- migration
write("apps/travu/migrations/__init__.py", "")
write("apps/travu/migrations/0001_initial.py", '''from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BusBooking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(db_index=True, max_length=40, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending payment"), ("paid", "Paid — booking"), ("confirmed", "Confirmed"), ("failed", "Failed"), ("refunded", "Refunded")], default="pending", max_length=12)),
                ("departure_state", models.CharField(max_length=40)),
                ("destination_state", models.CharField(max_length=40)),
                ("trip_id", models.CharField(max_length=40)),
                ("order_id", models.CharField(max_length=40)),
                ("origin_id", models.CharField(max_length=40)),
                ("destination_id", models.CharField(max_length=40)),
                ("boarding_at", models.CharField(blank=True, max_length=40)),
                ("provider", models.CharField(blank=True, max_length=40)),
                ("trip_date", models.CharField(max_length=20)),
                ("narration", models.CharField(blank=True, max_length=255)),
                ("departure_terminal", models.CharField(blank=True, max_length=255)),
                ("destination_terminal", models.CharField(blank=True, max_length=255)),
                ("vehicle_no", models.CharField(blank=True, max_length=120)),
                ("seat_numbers", models.CharField(max_length=120)),
                ("total_seats", models.PositiveIntegerField(default=0)),
                ("amount_per_seat", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("currency", models.CharField(default="NGN", max_length=3)),
                ("agent_email", models.EmailField(blank=True, max_length=254)),
                ("payment_reference", models.CharField(blank=True, db_index=True, max_length=120)),
                ("travu_order_id", models.CharField(blank=True, db_index=True, max_length=64)),
                ("travu_order_number", models.CharField(blank=True, max_length=64)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bus_bookings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BusPassenger",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(blank=True, max_length=10)),
                ("name", models.CharField(max_length=120)),
                ("age", models.CharField(blank=True, max_length=4)),
                ("sex", models.CharField(blank=True, max_length=10)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("blood", models.CharField(blank=True, max_length=6)),
                ("next_of_kin", models.CharField(blank=True, max_length=120)),
                ("next_of_kin_phone", models.CharField(blank=True, max_length=20)),
                ("is_primary", models.BooleanField(default=False)),
                ("seat_number", models.CharField(blank=True, max_length=8)),
                ("booking", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="passengers", to="travu.busbooking")),
            ],
            options={"ordering": ["-is_primary", "id"]},
        ),
        migrations.CreateModel(
            name="TravuApiLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("endpoint", models.CharField(max_length=64)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("status_code", models.PositiveIntegerField(default=0)),
                ("ok", models.BooleanField(default=False)),
                ("error", models.CharField(blank=True, max_length=255)),
                ("booking", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="api_logs", to="travu.busbooking")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
''')

# ------------------------------------------------------------------- wiring
edit("config/settings/base.py", [
    (
        '    "apps.notifications",   # device push tokens + Expo push sender',
        '    "apps.notifications",   # device push tokens + Expo push sender\n'
        '    "apps.travu",           # Travu intercity bus booking',
    ),
    (
        'AUTH_USER_MODEL = "accounts.User"',
        'AUTH_USER_MODEL = "accounts.User"\n\n'
        '# Bus booking convenience fee per seat (OAM revenue). Override via env.\n'
        'BUS_FEE_PER_SEAT = env.int("BUS_FEE_PER_SEAT", default=500)',
    ),
])

edit("config/urls.py", [(
    '    path("api/v1/notifications/", include("apps.notifications.urls")),',
    '    path("api/v1/notifications/", include("apps.notifications.urls")),\n'
    '    path("api/v1/travu/", include("apps.travu.urls")),',
)])

print("\\nDONE. Travu booking backend installed. Now run:  python manage.py migrate")
