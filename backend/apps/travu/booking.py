"""
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
