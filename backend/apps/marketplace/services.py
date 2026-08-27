"""Marketplace domain logic: tier limits + posting rules."""
from __future__ import annotations

from django.utils import timezone

import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from django.conf import settings
from integrations.base import ProviderFactory
from apps.payments.pricing import resolve_payment_currency, subscription_price
from integrations.base.dto import TxnStatus
from integrations.base.exceptions import ProviderError

from .models import (
    FEATURED_TIERS,
    Listing,
    SellerSubscription,
    SubscriptionPayment,
    SUBSCRIPTION_DAYS,
    SUBSCRIPTION_PRICES,
)


class MarketplaceError(Exception):
    """User-facing marketplace problem."""


class MarketplaceService:
    @staticmethod
    def get_subscription(user) -> SellerSubscription:
        sub, _ = SellerSubscription.objects.get_or_create(user=user)
        return sub

    @staticmethod
    def active_listing_count(user) -> int:
        return Listing.objects.filter(
            seller=user, status=Listing.Status.ACTIVE, expires_at__gt=timezone.now()
        ).count()

    @staticmethod
    def check_can_post(user, category):
        # OAM MOTORS (and any admin-only category): staff only
        if category.is_admin_only and not user.is_staff:
            raise MarketplaceError("Only OAM can post in this category.")
        # tier active-listing limit (None = unlimited)
        sub = MarketplaceService.get_subscription(user)
        limit = sub.listing_limit()
        if limit is not None and MarketplaceService.active_listing_count(user) >= limit:
            raise MarketplaceError(
                f"Your {sub.active_tier} plan allows up to {limit} active listings. "
                f"Upgrade to post more."
            )

    @staticmethod
    def browse(*, category=None, q=None, min_price=None, max_price=None,
               location=None, condition=None):
        qs = (Listing.objects.filter(status=Listing.Status.ACTIVE,
                                     expires_at__gt=timezone.now())
              .select_related("category", "seller").prefetch_related("images"))
        if category:
            qs = qs.filter(category__slug=category) if not _is_uuid(category) \
                else qs.filter(category_id=category)
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        if location:
            qs = qs.filter(location__icontains=location)
        if condition:
            qs = qs.filter(condition=condition)
        return qs

    @staticmethod
    def should_feature(user) -> bool:
        return MarketplaceService.get_subscription(user).active_tier in FEATURED_TIERS

    @staticmethod
    def initiate_subscription(*, user, tier, currency="NGN"):
        """Create a pending payment and get a Paystack checkout URL."""
        tier = str(tier).lower()
        if tier not in SUBSCRIPTION_PRICES:
            raise MarketplaceError("Choose a valid paid tier: pro or premium.")
        currency = resolve_payment_currency(currency)
        price = subscription_price(tier, currency)
        reference = f"SUB-{uuid.uuid4().hex[:20]}"
        email = getattr(user, "email", "") or f"{user.id}@users.oam"

        gateway = ProviderFactory.get("payments", settings.LISTING_UPGRADE_PROVIDER)
        try:
            init = gateway.initialize_charge(
                amount=price, currency=currency.upper(), email=email,
                reference=reference,
                metadata={"purpose": "marketplace_subscription", "tier": tier,
                          "user": str(user.id),
                          "name": (f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or getattr(user, "email", "") or "OAM Customer"),
                          "phone": getattr(user, "phone", "") or ""},
            )
        except ProviderError as exc:
            raise MarketplaceError(f"Could not start payment: {exc}")

        payment = SubscriptionPayment.objects.create(
            user=user, tier=tier, amount=price, currency=currency.upper(),
            reference=reference, period_days=SUBSCRIPTION_DAYS,
            provider=gateway.provider_key, status=SubscriptionPayment.Status.PENDING,
            authorization_url=init.authorization_url, raw=init.raw or {},
        )
        return payment, init

    @staticmethod
    def activate_from_payment(payment: SubscriptionPayment) -> SellerSubscription:
        """Mark a payment paid (once) and (re)activate the seller's tier."""
        with transaction.atomic():
            p = SubscriptionPayment.objects.select_for_update().get(pk=payment.pk)
            sub = MarketplaceService.get_subscription(p.user)
            if p.status == SubscriptionPayment.Status.PAID:
                return sub                      # idempotent
            p.status = SubscriptionPayment.Status.PAID
            p.save(update_fields=["status", "updated_at"])

            now = timezone.now()
            base = (sub.expires_at if (sub.active_tier == p.tier and sub.expires_at
                                       and sub.expires_at > now) else now)
            sub.tier = p.tier
            sub.expires_at = base + timedelta(days=p.period_days)
            sub.save(update_fields=["tier", "expires_at", "updated_at"])
        return sub

    @staticmethod
    def verify_subscription(*, user, reference) -> tuple:
        """Verify a payment with the gateway; activate the tier on success."""
        payment = SubscriptionPayment.objects.filter(reference=reference, user=user).first()
        if payment is None:
            raise MarketplaceError("Payment not found.")
        if payment.status == SubscriptionPayment.Status.PAID:
            return MarketplaceService.get_subscription(user), payment  # already done

        gateway = ProviderFactory.get("payments", payment.provider or None)
        try:
            status = gateway.verify_charge(reference)
        except ProviderError as exc:
            raise MarketplaceError(f"Could not verify payment: {exc}")

        if status.status == TxnStatus.SUCCESS:
            MarketplaceService.activate_from_payment(payment)
        elif status.status == TxnStatus.FAILED:
            payment.status = SubscriptionPayment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])
        payment.refresh_from_db()
        return MarketplaceService.get_subscription(user), payment

    @staticmethod
    def activate_by_reference(reference) -> bool:
        """Used by the webhook: activate a pending payment by reference."""
        payment = SubscriptionPayment.objects.filter(reference=reference).first()
        if payment is None:
            return False
        MarketplaceService.activate_from_payment(payment)
        return True



def _is_uuid(value):
    import uuid
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False
