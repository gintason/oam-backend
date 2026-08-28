"""
Pay-per-service with a CARD (Paystack) — charge the card for the exact service
amount, then deliver the service automatically.

Design (reuses the payment rails you already live-tested):
  1. POST /billing/purchase/card/  -> we record WHAT to deliver (a CardCheckout)
     and start a Paystack charge for that exact amount via FundingService.
  2. The user pays on Paystack's hosted page with their card.
  3. When the payment succeeds, FundingService.settle() credits the user's wallet.
     A post_save signal here notices that settlement and IMMEDIATELY runs the
     real bill purchase, so the airtime/data/meter token/subscription is
     delivered without the user ever "funding a wallet" as a separate step.
  4. If delivery fails, the money simply remains in the user's wallet (they are
     never charged for nothing) and the checkout is marked 'payment_received'
     so it can be retried.

Why route through the wallet internally: your BillingService holds funds from
the wallet, calls the VTU provider, then captures on success / refunds on
failure. Keeping that path means card purchases inherit the same guarantees and
the same double-entry ledger — no parallel money code to audit.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import TimeStampedModel
from apps.common.permissions import IsVerified
from apps.payments.models import ServiceTransaction
from apps.payments.services import FundingService

from .models import BillOrder
from .services import BillingError, BillingService


class CardCheckout(TimeStampedModel):
    """A service purchase the user chose to pay for by card."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        PAYMENT_RECEIVED = "payment_received", "Payment received"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="card_checkouts",
    )

    # what to deliver once paid
    country = models.CharField(max_length=2, default="NG")
    category = models.CharField(max_length=20)          # airtime/data/electricity/cable
    code = models.CharField(max_length=40)              # biller code (MTN, IKEDC, DSTV...)
    recipient = models.CharField(max_length=64)         # phone / meter / smartcard
    plan_code = models.CharField(max_length=64, blank=True)
    meter_type = models.CharField(max_length=16, blank=True)   # electricity: prepaid/postpaid
    verification_id = models.CharField(max_length=64, blank=True)  # electricity/cable: CustomerVerification id
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")

    # payment + delivery linkage
    funding_reference = models.CharField(max_length=80, unique=True, db_index=True)
    bill_order = models.ForeignKey(
        BillOrder, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="card_checkout",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.category} {self.amount} {self.currency} [{self.status}]"


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
class CardCheckoutService:
    @staticmethod
    def start(*, user, category, code, recipient, amount, currency="NGN",
              country="NG", plan_code="", meter_type="", verification_id="", callback_url=""):
        """Validate the biller, then open a Paystack charge for the exact amount."""
        # Fail fast on a bad biller BEFORE taking any money.
        BillingService._resolve_biller(country, category, code)

        txn, init = FundingService.initialize(user, amount, currency, callback_url=callback_url or None)

        checkout = CardCheckout.objects.create(
            user=user, country=country, category=category, code=code,
            recipient=recipient, plan_code=plan_code or "",
            meter_type=meter_type or "",
            verification_id=verification_id or "",
            amount=txn.amount, currency=txn.currency,
            funding_reference=txn.internal_reference,
        )
        return checkout, init.authorization_url

    @staticmethod
    def _purchase_for(c: "CardCheckout"):
        """
        Route to the right BillingService method for the category.

        Electricity and cable must be bought against a prior CustomerVerification
        (that's what proves the meter/smartcard was checked), so they take
        verification_id and have their own service methods. Airtime and data use
        the generic purchase.
        """
        if c.category == "electricity":
            if not c.verification_id:
                raise BillingError(
                    "This meter was not verified before payment, so delivery "
                    "cannot be completed. Your money is in your wallet."
                )
            return BillingService.purchase_electricity(
                user=c.user, country=c.country, code=c.code,
                customer_id=c.recipient, meter_type=c.meter_type,
                amount=c.amount, verification_id=c.verification_id,
                currency=c.currency,
            )

        if c.category == "cable":
            if not c.verification_id:
                raise BillingError(
                    "This smartcard was not verified before payment, so delivery "
                    "cannot be completed. Your money is in your wallet."
                )
            return BillingService.purchase_cable(
                user=c.user, country=c.country, code=c.code,
                customer_id=c.recipient, variation_id=c.plan_code,
                verification_id=c.verification_id, currency=c.currency,
            )

        if c.category == "betting":
            if not c.verification_id:
                raise BillingError(
                    "This betting account was not verified before payment, so "
                    "delivery cannot be completed. Your money is in your wallet."
                )
            credit = Decimal(str(c.amount)) - Decimal("50")
            return BillingService.purchase_betting(
                user=c.user, code=c.code, customer_id=c.recipient,
                amount=credit, verification_id=c.verification_id, currency=c.currency,
            )

        return BillingService.purchase(
            user=c.user, country=c.country, category=c.category,
            code=c.code, recipient=c.recipient, amount=c.amount,
            currency=c.currency, plan_code=c.plan_code,
        )

    @staticmethod
    def deliver(checkout: "CardCheckout") -> "CardCheckout":
        """
        Run the actual purchase after payment landed. Idempotent: safe to call
        from the webhook and the return-page verify at the same time.
        """
        with transaction.atomic():
            locked = (CardCheckout.objects
                      .select_for_update()
                      .filter(pk=checkout.pk).first())
            if locked is None or locked.status == CardCheckout.Status.DELIVERED:
                return locked or checkout
            # mark as claimed so a concurrent call doesn't double-purchase
            locked.status = CardCheckout.Status.PAYMENT_RECEIVED
            locked.save(update_fields=["status", "updated_at"])

        try:
            order = CardCheckoutService._purchase_for(locked)
        except (BillingError, Exception) as exc:  # noqa: BLE001 - record and keep funds
            locked.failure_reason = str(exc)[:255]
            locked.save(update_fields=["failure_reason", "updated_at"])
            return locked

        locked.bill_order = order
        locked.status = (
            CardCheckout.Status.DELIVERED
            if order.status == BillOrder.Status.SUCCESS
            else CardCheckout.Status.PAYMENT_RECEIVED
        )
        if order.status != BillOrder.Status.SUCCESS:
            locked.failure_reason = "Provider did not confirm delivery; funds remain in wallet."
        locked.save(update_fields=["bill_order", "status", "failure_reason", "updated_at"])
        return locked

    @staticmethod
    def settle_and_deliver(reference: str):
        """Verify payment with the gateway (idempotent), then deliver if paid."""
        checkout = CardCheckout.objects.filter(funding_reference=reference).first()
        if checkout is None:
            return None
        FundingService.settle(reference)          # credits the wallet if paid
        txn = ServiceTransaction.objects.filter(internal_reference=reference).first()
        if txn and txn.status == ServiceTransaction.Status.SUCCESS:
            return CardCheckoutService.deliver(checkout)
        return checkout


# --------------------------------------------------------------------------- #
# Auto-deliver when the funding transaction settles (webhook or verify)
# --------------------------------------------------------------------------- #
@receiver(post_save, sender=ServiceTransaction)
def _deliver_after_payment(sender, instance: ServiceTransaction, **kwargs):
    """When a funding txn hits SUCCESS, deliver any card checkout waiting on it."""
    if instance.status != ServiceTransaction.Status.SUCCESS:
        return
    checkout = CardCheckout.objects.filter(
        funding_reference=instance.internal_reference
    ).exclude(status=CardCheckout.Status.DELIVERED).first()
    if checkout is None:
        return
    transaction.on_commit(lambda: CardCheckoutService.deliver(checkout))


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
class CardCheckoutStartSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=["airtime", "data", "electricity", "cable"])
    code = serializers.CharField(max_length=40)
    recipient = serializers.CharField(max_length=64)
    amount = serializers.DecimalField(max_digits=20, decimal_places=2, min_value=Decimal("1"))
    currency = serializers.CharField(max_length=3, default="NGN", required=False)
    country = serializers.CharField(max_length=2, default="NG", required=False)
    plan_code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    meter_type = serializers.CharField(max_length=16, required=False, allow_blank=True)
    verification_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    callback_url = serializers.CharField(max_length=300, required=False, allow_blank=True)


class CardCheckoutSerializer(serializers.ModelSerializer):
    order_status = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()

    class Meta:
        model = CardCheckout
        fields = ("id", "category", "code", "recipient", "amount", "currency",
                  "plan_code", "meter_type", "verification_id", "funding_reference", "status", "failure_reason",
                  "order_status", "order_reference", "created_at")

    def get_order_status(self, obj):
        return obj.bill_order.status if obj.bill_order else None

    def get_order_reference(self, obj):
        return obj.bill_order.reference if obj.bill_order else None


class CardPurchaseStartView(APIView):
    """POST /billing/purchase/card/ — pay for a service with a card."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        s = CardCheckoutStartSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        try:
            checkout, authorization_url = CardCheckoutService.start(
                user=request.user,
                category=data["category"], code=data["code"],
                recipient=data["recipient"], amount=data["amount"],
                currency=data.get("currency", "NGN"),
                country=data.get("country", "NG"),
                plan_code=data.get("plan_code", ""),
                meter_type=data.get("meter_type", ""),
                verification_id=data.get("verification_id", ""),
                callback_url=data.get("callback_url", ""),
            )
        except BillingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "checkout": CardCheckoutSerializer(checkout).data,
            "authorization_url": authorization_url,
            "reference": checkout.funding_reference,
        }, status=status.HTTP_201_CREATED)


class CardPurchaseStatusView(APIView):
    """GET /billing/purchase/card/<reference>/ — verify payment + deliver."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, reference):
        checkout = CardCheckout.objects.filter(
            funding_reference=reference, user=request.user
        ).first()
        if checkout is None:
            return Response({"detail": "Unknown reference."},
                            status=status.HTTP_404_NOT_FOUND)
        checkout = CardCheckoutService.settle_and_deliver(reference) or checkout
        return Response(CardCheckoutSerializer(checkout).data)
