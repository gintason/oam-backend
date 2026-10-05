"""
Delivery fee calculation — pure, deterministic, server-side only.

    distance   = haversine(pickup, dropoff) × road_factor
    subtotal   = base + per_km × distance + per_kg × max(0, weight − free_weight)
    fee        = max(min_fare, subtotal × zone × category × surge), rounded UP to `round_to`
    platform   = fee × commission_rate
    rider      = fee − platform

Fares come from the smallest active DeliveryZone containing the pickup point,
otherwise from DispatchSettings defaults. Surge is the larger of any active
manual SurgePricing window (zone-specific or global) and the automatic demand
surge (pending deliveries per online rider), capped at `max_surge`.

The client never sends a price: `quote()` is re-run when the delivery is
created and that result is frozen on the row.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from datetime import timedelta
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal

from django.db.models import Q
from django.utils import timezone

from .models import (
    DeliveryRequest,
    DeliveryStatus,
    DeliveryZone,
    DispatchSettings,
    PackageCategory,
    RiderProfile,
    SurgePricing,
    VehicleType,
)

EARTH_KM = 6371.0088
TWO = Decimal("0.01")

CATEGORY_MULTIPLIER = {
    PackageCategory.DOCUMENTS: Decimal("1.00"),
    PackageCategory.SMALL: Decimal("1.00"),
    PackageCategory.MEDIUM: Decimal("1.10"),
    PackageCategory.LARGE: Decimal("1.30"),
    PackageCategory.FOOD: Decimal("1.05"),
    PackageCategory.FRAGILE: Decimal("1.20"),
}

# Rough city speeds (km/h) for an ETA; motorcycles are the default fleet.
AVG_SPEED_KMH = {
    VehicleType.BICYCLE: 12, VehicleType.MOTORCYCLE: 25, VehicleType.CAR: 20, VehicleType.VAN: 18,
}

MAX_DISTANCE_KM = Decimal("150")
MAX_WEIGHT_KG = Decimal("200")


class PricingError(ValueError):
    pass


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    lat1, lng1, lat2, lng2 = (math.radians(float(v)) for v in (lat1, lng1, lat2, lng2))
    a = (math.sin((lat2 - lat1) / 2) ** 2
         + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2)
    return 2 * EARTH_KM * math.asin(min(1.0, math.sqrt(a)))


def _validate_coords(*pairs):
    for lat, lng in pairs:
        try:
            lat, lng = float(lat), float(lng)
        except (TypeError, ValueError):
            raise PricingError("Pick both locations on the map.")
        if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (lat == 0 and lng == 0):
            raise PricingError("That location doesn't look right. Pick it again on the map.")


def find_zone(lat, lng):
    """Smallest active zone whose circle contains (lat, lng)."""
    best = None
    for zone in DeliveryZone.objects.filter(is_active=True):
        d = haversine_km(lat, lng, zone.center_lat, zone.center_lng)
        if d <= float(zone.radius_km) and (best is None or zone.radius_km < best.radius_km):
            best = zone
    return best


def manual_surge(zone, now=None) -> tuple[Decimal, str]:
    now = now or timezone.now()
    qs = SurgePricing.objects.filter(is_active=True, starts_at__lte=now).filter(
        Q(ends_at__isnull=True) | Q(ends_at__gt=now))
    qs = qs.filter(Q(zone__isnull=True) | Q(zone=zone)) if zone else qs.filter(zone__isnull=True)
    top = qs.order_by("-multiplier").first()
    return (top.multiplier, top.reason) if top else (Decimal("1.00"), "")


def demand_surge(cfg: DispatchSettings) -> Decimal:
    """Pending (paid, unassigned) deliveries per online rider in the last 30 min."""
    if not cfg.auto_surge_enabled:
        return Decimal("1.00")
    since = timezone.now() - timedelta(minutes=30)
    pending = DeliveryRequest.objects.filter(
        status=DeliveryStatus.PENDING, payment_status__in=("paid", "cash", "due"),
        created_at__gte=since).count()
    if pending < 3:          # a quiet system never surges on noise
        return Decimal("1.00")
    online = RiderProfile.objects.filter(
        verification_status=RiderProfile.Verification.APPROVED,
        availability=RiderProfile.Availability.ONLINE).count()
    ratio = pending / max(online, 1)
    if ratio > 3:
        return Decimal("1.50")
    if ratio > 2:
        return Decimal("1.20")
    return Decimal("1.00")


@dataclass
class Quote:
    distance_km: Decimal
    duration_min: int
    zone_id: int | None
    zone_name: str
    base_fare: Decimal
    distance_fare: Decimal
    weight_fare: Decimal
    zone_multiplier: Decimal
    category_multiplier: Decimal
    surge_multiplier: Decimal
    surge_reason: str
    subtotal: Decimal
    fee: Decimal
    platform_fee: Decimal
    rider_payout: Decimal
    currency: str
    min_fare_applied: bool

    def as_dict(self) -> dict:
        out = asdict(self)
        for k, v in out.items():
            if isinstance(v, Decimal):
                out[k] = str(v)
        return out

    def model_fields(self) -> dict:
        """Fields frozen on DeliveryRequest."""
        return {
            "distance_km": self.distance_km, "duration_min": self.duration_min,
            "zone_id": self.zone_id, "base_fare": self.base_fare,
            "distance_fare": self.distance_fare, "weight_fare": self.weight_fare,
            "zone_multiplier": self.zone_multiplier,
            "category_multiplier": self.category_multiplier,
            "surge_multiplier": self.surge_multiplier, "fee": self.fee,
            "platform_fee": self.platform_fee, "rider_payout": self.rider_payout,
            "currency": self.currency,
        }


def _round_up(value: Decimal, step: int) -> Decimal:
    if step <= 1:
        return value.quantize(Decimal("1"), rounding=ROUND_CEILING)
    s = Decimal(step)
    return ((value / s).to_integral_value(rounding=ROUND_CEILING) * s).quantize(TWO)


def quote(*, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, weight_kg=1,
          category=PackageCategory.SMALL, vehicle_type=VehicleType.MOTORCYCLE) -> Quote:
    _validate_coords((pickup_lat, pickup_lng), (dropoff_lat, dropoff_lng))
    try:
        weight = Decimal(str(weight_kg or 0))
    except Exception:
        raise PricingError("Enter the package weight in kg.")
    if weight < 0 or weight > MAX_WEIGHT_KG:
        raise PricingError(f"Packages must weigh between 0 and {MAX_WEIGHT_KG} kg.")
    if category not in CATEGORY_MULTIPLIER:
        raise PricingError("Choose a package type.")

    cfg = DispatchSettings.load()
    straight = haversine_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    distance = (Decimal(str(straight)) * cfg.road_factor).quantize(TWO, rounding=ROUND_HALF_UP)
    if distance < Decimal("0.2"):
        raise PricingError("Pickup and drop-off are the same place.")
    if distance > MAX_DISTANCE_KM:
        raise PricingError(f"Deliveries are limited to {MAX_DISTANCE_KM:.0f} km for now.")

    zone = find_zone(pickup_lat, pickup_lng)
    if zone:
        base, per_km, per_kg, min_fare, zone_mult, currency = (
            zone.base_fare, zone.per_km, zone.per_kg, zone.min_fare, zone.zone_multiplier,
            zone.currency)
    else:
        base, per_km, per_kg, min_fare, zone_mult, currency = (
            cfg.default_base_fare, cfg.default_per_km, cfg.default_per_kg, cfg.default_min_fare,
            Decimal("1.00"), "NGN")

    distance_fare = (per_km * distance).quantize(TWO, rounding=ROUND_HALF_UP)
    extra_kg = max(Decimal("0"), weight - cfg.free_weight_kg)
    weight_fare = (per_kg * extra_kg).quantize(TWO, rounding=ROUND_HALF_UP)
    cat_mult = CATEGORY_MULTIPLIER[category]

    manual, reason = manual_surge(zone)
    auto = demand_surge(cfg)
    surge = min(max(manual, auto), cfg.max_surge)
    if auto > manual and auto > 1:
        reason = "High demand"

    subtotal = base + distance_fare + weight_fare
    raw = subtotal * zone_mult * cat_mult * surge
    fee = _round_up(max(raw, min_fare), cfg.round_to)
    platform = (fee * cfg.commission_rate).quantize(TWO, rounding=ROUND_HALF_UP)
    rider = fee - platform

    speed = AVG_SPEED_KMH.get(vehicle_type, 25)
    duration = max(5, math.ceil(float(distance) / speed * 60) + 5)   # + handover time

    return Quote(
        distance_km=distance, duration_min=duration, zone_id=zone.id if zone else None,
        zone_name=zone.name if zone else "", base_fare=base.quantize(TWO),
        distance_fare=distance_fare, weight_fare=weight_fare,
        zone_multiplier=zone_mult.quantize(TWO), category_multiplier=cat_mult,
        surge_multiplier=surge.quantize(TWO), surge_reason=reason if surge > 1 else "",
        subtotal=subtotal.quantize(TWO), fee=fee, platform_fee=platform, rider_payout=rider,
        currency=currency, min_fare_applied=raw < min_fare,
    )
