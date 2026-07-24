"""Home services logic: proximity search (Haversine) + paid profile boosts (Paystack)."""
from __future__ import annotations

import math
import uuid
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from integrations.base import ProviderFactory
from integrations.base.dto import TxnStatus
from integrations.base.exceptions import ProviderError

from .models import (
    ArtisanProfile,
    BOOST_PACKAGES,
    BoostPayment,
    DEFAULT_BOOST_DAYS,
    ServiceCategory,
)

EARTH_KM = 6371.0


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r1, r2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(r1) * math.cos(r2) * math.sin(dlng / 2) ** 2)
    return EARTH_KM * 2 * math.asin(math.sqrt(a))


class HomeServiceError(Exception):
    """User-facing home-services problem."""


class HomeServiceService:
    # ---------------- proximity search ----------------
    @staticmethod
    def search_nearby(*, lat, lng, radius_km=10.0, category=None, q=None, limit=50):
        lat, lng, radius_km = float(lat), float(lng), float(radius_km)
        qs = (ArtisanProfile.objects
              .filter(status=ArtisanProfile.Status.ACTIVE, is_available=True,
                      latitude__isnull=False, longitude__isnull=False)
              .select_related("category", "user"))
        if category:
            qs = qs.filter(category__slug=category)
        if q:
            qs = qs.filter(Q(business_name__icontains=q) | Q(description__icontains=q))

        # bounding-box prefilter (cheap), then exact Haversine (accurate)
        dlat = radius_km / 111.0
        cos_lat = max(math.cos(math.radians(lat)), 0.01)
        dlng = radius_km / (111.0 * cos_lat)
        qs = qs.filter(latitude__gte=lat - dlat, latitude__lte=lat + dlat,
                       longitude__gte=lng - dlng, longitude__lte=lng + dlng)

        results = []
        for a in qs:
            d = haversine_km(lat, lng, a.latitude, a.longitude)
            if d <= radius_km:
                a.distance_km = round(d, 2)
                results.append(a)
        # featured first, then nearest
        results.sort(key=lambda a: (not a.is_currently_featured, a.distance_km))
        return results[:limit]

    # ---------------- boosts (Paystack) ----------------
    @staticmethod
    def initiate_boost(*, user, days=DEFAULT_BOOST_DAYS, currency="NGN"):
        try:
            days = int(days)
        except (TypeError, ValueError):
            raise HomeServiceError("Invalid boost duration.")
        if days not in BOOST_PACKAGES:
            opts = ", ".join(str(d) for d in BOOST_PACKAGES)
            raise HomeServiceError(f"Choose a valid boost duration ({opts} days).")
        if not hasattr(user, "artisan_profile"):
            raise HomeServiceError("Create your artisan profile before boosting.")

        price = BOOST_PACKAGES[days]
        reference = f"BOOST-{uuid.uuid4().hex[:20]}"
        email = getattr(user, "email", "") or f"{user.id}@users.oam"
        gateway = ProviderFactory.get("payments")
        try:
            init = gateway.initialize_charge(
                amount=price, currency=currency.upper(), email=email, reference=reference,
                metadata={"purpose": "artisan_boost", "days": days, "user": str(user.id)},
            )
        except ProviderError as exc:
            raise HomeServiceError(f"Could not start payment: {exc}")

        payment = BoostPayment.objects.create(
            user=user, days=days, amount=price, currency=currency.upper(),
            reference=reference, provider=gateway.provider_key,
            status=BoostPayment.Status.PENDING,
            authorization_url=init.authorization_url, raw=init.raw or {},
        )
        return payment, init

    @staticmethod
    def _activate(payment: BoostPayment):
        with transaction.atomic():
            p = BoostPayment.objects.select_for_update().get(pk=payment.pk)
            if p.status == BoostPayment.Status.PAID:
                return
            p.status = BoostPayment.Status.PAID
            p.save(update_fields=["status", "updated_at"])
            profile = ArtisanProfile.objects.select_for_update().filter(user=p.user).first()
            if profile:
                now = timezone.now()
                base = (profile.featured_until if profile.featured_until
                        and profile.featured_until > now else now)
                profile.is_featured = True
                profile.featured_until = base + timedelta(days=p.days)
                profile.save(update_fields=["is_featured", "featured_until", "updated_at"])

    @staticmethod
    def verify_boost(*, user, reference):
        payment = BoostPayment.objects.filter(reference=reference, user=user).first()
        if payment is None:
            raise HomeServiceError("Payment not found.")
        if payment.status == BoostPayment.Status.PAID:
            return payment
        gateway = ProviderFactory.get("payments")
        try:
            status = gateway.verify_charge(reference)
        except ProviderError as exc:
            raise HomeServiceError(f"Could not verify payment: {exc}")
        if status.status == TxnStatus.SUCCESS:
            HomeServiceService._activate(payment)
        elif status.status == TxnStatus.FAILED:
            payment.status = BoostPayment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])
        payment.refresh_from_db()
        return payment

    @staticmethod
    def activate_by_reference(reference) -> bool:
        payment = BoostPayment.objects.filter(reference=reference).first()
        if payment is None:
            return False
        HomeServiceService._activate(payment)
        return True
