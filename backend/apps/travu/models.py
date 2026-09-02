"""
Bus booking persistence for the Travu integration.

A BusBooking is created when the user starts checkout (status=PENDING). Once
payment is verified we call Travu book_trip; on success we store the ticket
confirmation and flip to CONFIRMED. TravuApiLog captures raw request/response
for every Travu call for debugging and reconciliation.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class BusBooking(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        PAID = "paid", "Paid — booking"
        CONFIRMED = "confirmed", "Confirmed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="bus_bookings")
    reference = models.CharField(max_length=40, unique=True, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    # trip selection (all stored as strings — operators mix ints/strings)
    departure_state = models.CharField(max_length=40)
    destination_state = models.CharField(max_length=40)
    trip_id = models.CharField(max_length=40)
    order_id = models.CharField(max_length=40)
    origin_id = models.CharField(max_length=40)
    destination_id = models.CharField(max_length=40)
    boarding_at = models.CharField(max_length=40, blank=True)
    provider = models.CharField(max_length=40, blank=True)
    trip_date = models.CharField(max_length=20)
    narration = models.CharField(max_length=255, blank=True)
    departure_terminal = models.CharField(max_length=255, blank=True)
    destination_terminal = models.CharField(max_length=255, blank=True)
    vehicle_no = models.CharField(max_length=120, blank=True)

    # money
    seat_numbers = models.CharField(max_length=120)          # e.g. "1,2"
    total_seats = models.PositiveIntegerField(default=0)
    amount_per_seat = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)  # what the user pays
    currency = models.CharField(max_length=3, default="NGN")
    agent_email = models.EmailField(blank=True)

    # payment linkage (wallet reference or gateway reference)
    payment_reference = models.CharField(max_length=120, blank=True, db_index=True)

    # Travu confirmation
    travu_order_id = models.CharField(max_length=64, blank=True, db_index=True)
    travu_order_number = models.CharField(max_length=64, blank=True)

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Bus {self.reference} · {self.departure_state}->{self.destination_state} [{self.status}]"


class BusPassenger(TimeStampedModel):
    booking = models.ForeignKey(BusBooking, on_delete=models.CASCADE, related_name="passengers")
    title = models.CharField(max_length=10, blank=True)
    name = models.CharField(max_length=120)
    age = models.CharField(max_length=4, blank=True)
    sex = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    blood = models.CharField(max_length=6, blank=True)
    next_of_kin = models.CharField(max_length=120, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    is_primary = models.BooleanField(default=False)
    seat_number = models.CharField(max_length=8, blank=True)

    class Meta:
        ordering = ["-is_primary", "id"]

    def __str__(self):
        return f"{self.name} (seat {self.seat_number})"


class TravuApiLog(TimeStampedModel):
    booking = models.ForeignKey(BusBooking, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="api_logs")
    endpoint = models.CharField(max_length=64)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    status_code = models.PositiveIntegerField(default=0)
    ok = models.BooleanField(default=False)
    error = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.endpoint} [{self.status_code}] ok={self.ok}"
