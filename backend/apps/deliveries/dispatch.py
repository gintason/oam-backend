"""
Automatic rider matching.

A paid PENDING delivery is offered, in rounds, to the nearest few riders who
are APPROVED + ONLINE, have reported a location recently, are idle (no active
delivery, no live offer elsewhere) and whose vehicle suits the package.

    round 1: search_radius_km             → top `offer_batch` by distance, then rating
    round n: search_radius_km + (n-1)·step  (rounds with nobody in range are skipped)

Each offer lives `offer_timeout_s`. The first rider to accept wins (row locks
on the offer and the delivery serialise concurrent accepts); the other offers
become WITHDRAWN. When every offer in a round is rejected or expired, the next
round starts. After `max_rounds` the delivery is flagged `dispatch_exhausted`
(the customer is told once) but stays searchable at the widest radius, so a
rider who comes online later can still take it.

There is no worker process: `advance()` is called lazily from rider/customer
polling and from the cron tick (`/deliveries/internal/tick/`).
"""
from __future__ import annotations

import logging
import math
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .events import delivery_updated, money, notify, push_only, broadcast, timeline
from .models import (
    ACTIVE_STATUSES,
    DeliveryRequest,
    DeliveryStatus,
    DispatchOffer,
    DispatchSettings,
    PackageCategory,
    RiderProfile,
    VehicleType,
)
from .pricing import haversine_km

logger = logging.getLogger(__name__)

HEAVY_KG = Decimal("25")
BICYCLE_MAX_KG = Decimal("5")
BICYCLE_MAX_KM = Decimal("8")


def vehicle_suits(vehicle_type, d) -> bool:
    if d.package_category == PackageCategory.LARGE or d.weight_kg > HEAVY_KG:
        return vehicle_type in (VehicleType.CAR, VehicleType.VAN)
    if vehicle_type == VehicleType.BICYCLE:
        return d.weight_kg <= BICYCLE_MAX_KG and d.distance_km <= BICYCLE_MAX_KM
    return True


def radius_for(round_no: int, cfg: DispatchSettings) -> float:
    return float(cfg.search_radius_km) + max(0, round_no - 1) * float(cfg.radius_step_km)


def candidates(d, radius_km: float, cfg: DispatchSettings, now=None) -> list[tuple[RiderProfile, float]]:
    now = now or timezone.now()
    lat, lng = float(d.pickup_lat), float(d.pickup_lng)
    dlat = radius_km / 111.0
    dlng = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))

    busy = (DeliveryRequest.objects.filter(status__in=ACTIVE_STATUSES, rider__isnull=False)
            .values("rider_id"))
    holding_offer = (DispatchOffer.objects.filter(status=DispatchOffer.Status.OFFERED,
                                                  expires_at__gt=now)
                     .values("rider_id"))
    already = DispatchOffer.objects.filter(delivery=d).values("rider_id")

    qs = (RiderProfile.objects
          .filter(verification_status=RiderProfile.Verification.APPROVED,
                  availability=RiderProfile.Availability.ONLINE,
                  location_updated_at__gte=now - timedelta(minutes=cfg.location_fresh_min),
                  lat__gte=lat - dlat, lat__lte=lat + dlat,
                  lng__gte=lng - dlng, lng__lte=lng + dlng)
          .exclude(user_id=d.customer_id)
          .exclude(id__in=busy).exclude(id__in=holding_offer).exclude(id__in=already)
          .select_related("user"))

    found = []
    for rider in qs[:500]:
        if not vehicle_suits(rider.vehicle_type, d):
            continue
        dist = haversine_km(lat, lng, rider.lat, rider.lng)
        if dist <= radius_km:
            found.append((rider, dist))
    found.sort(key=lambda rd: (round(rd[1], 1), -float(rd[0].rating_avg)))
    return found


def _live_offers(d, now):
    return d.offers.filter(status=DispatchOffer.Status.OFFERED, expires_at__gt=now)


@transaction.atomic
def run_round(delivery_id) -> int:
    """Offer `delivery_id` to the next batch of riders. Returns offers made."""
    now = timezone.now()
    d = (DeliveryRequest.objects.select_for_update(of=("self",))
         .select_related("customer").filter(pk=delivery_id).first())
    if (d is None or d.status != DeliveryStatus.PENDING or d.rider_id
            or d.payment_status != DeliveryRequest.PaymentStatus.PAID):
        return 0
    if _live_offers(d, now).exists():
        return 0                                  # still waiting on this round

    cfg = DispatchSettings.load()
    max_rounds = max(1, cfg.max_rounds)
    round_no = min(d.dispatch_round + 1, max_rounds)
    found = []
    while True:
        found = candidates(d, radius_for(round_no, cfg), cfg, now)
        if found or round_no >= max_rounds:
            break
        round_no += 1

    d.dispatch_round = round_no
    newly_exhausted = False
    if not found and round_no >= max_rounds and not d.dispatch_exhausted:
        d.dispatch_exhausted = newly_exhausted = True
    d.save(update_fields=["dispatch_round", "dispatch_exhausted", "updated_at"])

    if newly_exhausted:
        timeline(d, DeliveryStatus.PENDING, note="No rider available nearby yet — still searching.")
        notify(d.customer, title="Still looking for a rider",
               body=f"No rider is free near the pickup yet for {d.reference}. We'll keep trying — "
                    "or cancel any time for a full refund.",
               data={"type": "delivery.no_rider", "delivery_id": str(d.id)})
        delivery_updated(d)
    if not found:
        return 0

    expires = now + timedelta(seconds=cfg.offer_timeout_s)
    batch = found[:max(1, cfg.offer_batch)]
    for rider, dist in batch:
        offer = DispatchOffer.objects.create(delivery=d, rider=rider, round=round_no,
                                             distance_km=Decimal(str(round(dist, 2))),
                                             expires_at=expires)
        payload = offer_payload(offer)
        broadcast([rider.user_id], "delivery.offer", payload)
        push_only(rider.user, title=f"New delivery · {money(d.rider_payout, d.currency)}",
                  body=f"Pickup {dist:.1f} km away · {d.pickup_address[:60]}",
                  data={"type": "delivery.offer", "offer_id": str(offer.id),
                        "delivery_id": str(d.id)})
    return len(batch)


def offer_payload(offer) -> dict:
    d = offer.delivery
    return {
        "id": offer.id, "delivery_id": str(d.id), "reference": d.reference,
        "round": offer.round, "distance_to_pickup_km": offer.distance_km,
        "expires_at": offer.expires_at,
        "pickup_address": d.pickup_address, "pickup_lat": d.pickup_lat, "pickup_lng": d.pickup_lng,
        "dropoff_address": d.dropoff_address, "dropoff_lat": d.dropoff_lat,
        "dropoff_lng": d.dropoff_lng, "distance_km": d.distance_km,
        "duration_min": d.duration_min, "package_category": d.package_category,
        "package_description": d.package_description, "weight_kg": d.weight_kg,
        "rider_payout": d.rider_payout, "currency": d.currency,
    }


def expire_offers(now=None) -> list:
    """Mark timed-out offers EXPIRED; return the affected delivery ids."""
    now = now or timezone.now()
    stale = DispatchOffer.objects.filter(status=DispatchOffer.Status.OFFERED, expires_at__lte=now)
    ids = list(stale.values_list("delivery_id", flat=True).distinct())
    if ids:
        stale.update(status=DispatchOffer.Status.EXPIRED, responded_at=now)
    return ids


def advance(delivery_ids=None, *, limit=50) -> int:
    """Expire stale offers and start the next round wherever nobody holds one."""
    now = timezone.now()
    expire_offers(now)
    qs = DeliveryRequest.objects.filter(status=DeliveryStatus.PENDING, rider__isnull=True,
                                        payment_status=DeliveryRequest.PaymentStatus.PAID)
    if delivery_ids is not None:
        qs = qs.filter(pk__in=list(delivery_ids))
    qs = qs.exclude(offers__status=DispatchOffer.Status.OFFERED, offers__expires_at__gt=now)
    made = 0
    for pk in qs.order_by("created_at").values_list("pk", flat=True)[:limit]:
        try:
            made += run_round(pk)
        except Exception:
            logger.exception("dispatch round failed for %s", pk)
    return made


def advance_throttled(seconds=5) -> int:
    """Global advance at most once per `seconds` (rider polling hits this a lot)."""
    try:
        if not cache.add("deliveries:advance", 1, seconds):
            return 0
    except Exception:
        pass
    return advance()
