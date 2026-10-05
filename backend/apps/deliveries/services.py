"""
Delivery workflow + money.

    customer:  quote → create (wallet hold | card checkout → verify → hold) → track → rate
    dispatch:  PENDING ──offer/accept──▶ ACCEPTED ─pickup─▶ PICKED_UP ─start─▶ IN_TRANSIT
                                                              ─deliver (code/photo)─▶ DELIVERED
    cancel:    customer/admin before pickup → hold released (full refund)

Money (apps.wallet ledger, never floats):
    pay      hold(customer wallet, fee)              wallet → suspense:hold
    deliver  capture(fee, cost=rider_payout)         suspense → deliveries:rider_clearing + oam:revenue
             credit(rider wallet, rider_payout)      deliveries:rider_clearing → rider wallet
    refund   release(customer wallet, fee)           suspense → wallet
"""
from __future__ import annotations

import hmac
import inspect
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone

from . import dispatch, pricing
from .events import DeliveryError, delivery_updated, money, notify, timeline, broadcast
from .models import (
    ACTIVE_STATUSES,
    DISPATCHABLE_PAYMENT,
    DeliveryRequest,
    DeliveryStatus,
    DeliveryTransaction,
    DispatchOffer,
    DispatchSettings,
    RiderDocument,
    RiderProfile,
)

logger = logging.getLogger(__name__)

RIDER_CLEARING = "deliveries:rider_clearing"
CARD_SOURCE = "gateway:flutterwave"
PENDING_TIMEOUT_MIN = 90          # paid but nobody accepted → auto-cancel + refund
UNPAID_TIMEOUT_MIN = 120          # card checkout never completed → cancel
MAX_CODE_ATTEMPTS = 5


def _name(user) -> str:
    n = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return n or (getattr(user, "email", "") or "").split("@")[0] or "OAM user"


def _locked(delivery_id) -> DeliveryRequest:
    d = (DeliveryRequest.objects.select_for_update(of=("self",))
         .select_related("customer", "rider", "rider__user").filter(pk=delivery_id).first())
    if d is None:
        raise DeliveryError("Delivery not found.", code="not_found", status=404)
    return d


# --------------------------------------------------------------------------- #
# Customer
# --------------------------------------------------------------------------- #

class CustomerService:
    @staticmethod
    def quote(data) -> pricing.Quote:
        try:
            return pricing.quote(
                pickup_lat=data["pickup_lat"], pickup_lng=data["pickup_lng"],
                dropoff_lat=data["dropoff_lat"], dropoff_lng=data["dropoff_lng"],
                weight_kg=data.get("weight_kg", 1),
                category=data.get("package_category") or "small")
        except pricing.PricingError as exc:
            raise DeliveryError(str(exc), code="invalid_route")

    @staticmethod
    def create(*, user, data) -> DeliveryRequest:
        """Validated serializer data in; a priced (and, for wallet, paid) delivery out."""
        q = CustomerService.quote(data)
        if q.currency not in getattr(settings, "SUPPORTED_CURRENCIES", ["NGN"]):
            raise DeliveryError("This area isn't available yet.", code="unsupported")
        method = data.get("payment_method") or DeliveryRequest.PaymentMethod.WALLET
        expected = data.get("expected_fee")
        if expected is not None and Decimal(str(expected)) != q.fee:
            # Price moved (surge started) between quote and confirm: ask again.
            raise DeliveryError(f"The price changed to {money(q.fee, q.currency)}. "
                                "Please review and confirm.", code="price_changed", status=409)
        fields = {k: data.get(k, "") for k in (
            "pickup_address", "pickup_contact_name", "pickup_contact_phone", "pickup_note",
            "dropoff_address", "recipient_name", "recipient_phone", "dropoff_note",
            "package_description")}
        with transaction.atomic():
            d = DeliveryRequest.objects.create(
                customer=user, payment_method=method,
                pickup_lat=data["pickup_lat"], pickup_lng=data["pickup_lng"],
                dropoff_lat=data["dropoff_lat"], dropoff_lng=data["dropoff_lng"],
                package_category=data.get("package_category") or "small",
                weight_kg=data.get("weight_kg") or 1,
                **fields, **q.model_fields())
            timeline(d, DeliveryStatus.PENDING, note="Delivery requested.", actor="customer")
            if method == DeliveryRequest.PaymentMethod.WALLET:
                PaymentService.pay_from_wallet(d)
            elif method == DeliveryRequest.PaymentMethod.CASH:
                PaymentService.mark_cash(d)
            elif method == DeliveryRequest.PaymentMethod.ON_DELIVERY:
                PaymentService.mark_due(d)
        if method == DeliveryRequest.PaymentMethod.CARD:
            PaymentService.start_card_checkout(d, return_url=data.get("return_url") or "")
        else:
            dispatch.advance([d.pk])
        d.refresh_from_db()
        return d

    @staticmethod
    def cancel(*, delivery_id, by="customer", user=None, reason="") -> DeliveryRequest:
        with transaction.atomic():
            d = _locked(delivery_id)
            if by == "customer" and d.customer_id != getattr(user, "id", None):
                raise DeliveryError("Delivery not found.", code="not_found", status=404)
            if d.status in (DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED):
                raise DeliveryError("This delivery is already finished.", code="finished", status=409)
            if by == "customer" and d.status not in (DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED):
                raise DeliveryError("The rider already has your package — contact them or support.",
                                    code="picked_up", status=409)
            now = timezone.now()
            rider = d.rider
            d.status = DeliveryStatus.CANCELLED
            d.cancelled_at, d.cancelled_by, d.cancel_reason = now, by, (reason or "")[:200]
            d.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancel_reason",
                                  "updated_at"])
            d.offers.filter(status=DispatchOffer.Status.OFFERED).update(
                status=DispatchOffer.Status.WITHDRAWN, responded_at=now)
            refunded = PaymentService.refund(d)
            timeline(d, DeliveryStatus.CANCELLED, note=reason or f"Cancelled by {by}.", actor=by)
        body = (f"{d.reference} was cancelled. {money(d.fee, d.currency)} is back in your wallet."
                if refunded else f"{d.reference} was cancelled.")
        if by != "customer":
            notify(d.customer, title="Delivery cancelled", body=body,
                   data={"type": "delivery.cancelled", "delivery_id": str(d.id)})
        if rider:
            notify(rider.user, title="Delivery cancelled",
                   body=f"{d.reference} was cancelled — you're free for new requests.",
                   data={"type": "delivery.cancelled", "delivery_id": str(d.id)})
        delivery_updated(d, extra_user_ids=[rider.user_id] if rider else ())
        return d

    @staticmethod
    def rate(*, user, delivery_id, rating, review="") -> DeliveryRequest:
        with transaction.atomic():
            d = _locked(delivery_id)
            if d.customer_id != user.id:
                raise DeliveryError("Delivery not found.", code="not_found", status=404)
            if d.status != DeliveryStatus.DELIVERED or not d.rider_id:
                raise DeliveryError("You can rate a rider once the package is delivered.")
            if d.rating:
                raise DeliveryError("You've already rated this delivery.", code="rated", status=409)
            d.rating, d.review = int(rating), (review or "")[:300]
            d.save(update_fields=["rating", "review", "updated_at"])
            agg = DeliveryRequest.objects.filter(rider_id=d.rider_id, rating__isnull=False).aggregate(
                avg=Avg("rating"), n=Count("id"))
            RiderProfile.objects.filter(pk=d.rider_id).update(
                rating_avg=Decimal(str(round(agg["avg"] or 0, 2))), rating_count=agg["n"] or 0)
        return d


# --------------------------------------------------------------------------- #
# Payments
# --------------------------------------------------------------------------- #

class PaymentService:
    @staticmethod
    def _gateway(key=None):
        from integrations.base import ProviderFactory
        return ProviderFactory.get("payments", key or getattr(
            settings, "DELIVERIES_PAYMENT_GATEWAY", "flutterwave"))

    @staticmethod
    def _wallet(user, currency):
        from apps.wallet.services import WalletService
        return WalletService.get_or_create_wallet(user, currency)

    @staticmethod
    def _mark_paid(d):
        d.payment_status = DeliveryRequest.PaymentStatus.PAID
        d.save(update_fields=["payment_status", "updated_at"])
        DeliveryTransaction.objects.get_or_create(delivery=d, defaults={
            "gross_amount": d.fee, "rider_payout": d.rider_payout, "platform_fee": d.platform_fee,
            "currency": d.currency, "ledger_reference": d.reference})
        timeline(d, d.status, note="Payment received." if d.rider_id else "Payment received — finding a rider.")

    @staticmethod
    def mark_cash(d):
        """Cash to the rider: nothing is held; the rider remits OAM's share later."""
        if not DispatchSettings.load().cash_enabled:
            raise DeliveryError("Cash payment isn't available right now. Pay with your wallet or card.",
                                code="cash_disabled")
        d.payment_status = DeliveryRequest.PaymentStatus.CASH
        d.save(update_fields=["payment_status", "updated_at"])
        DeliveryTransaction.objects.get_or_create(delivery=d, defaults={
            "gross_amount": d.fee, "rider_payout": d.rider_payout, "platform_fee": d.platform_fee,
            "currency": d.currency, "ledger_reference": d.reference})
        timeline(d, DeliveryStatus.PENDING, note=f"Cash on delivery — pay the rider {money(d.fee, d.currency)}.")

    @staticmethod
    def mark_due(d):
        """Pay on delivery: dispatch now; pay any time before or at the door
        (Flutterwave card/transfer link, or cash to the rider)."""
        d.payment_status = DeliveryRequest.PaymentStatus.DUE
        d.save(update_fields=["payment_status", "updated_at"])
        DeliveryTransaction.objects.get_or_create(delivery=d, defaults={
            "gross_amount": d.fee, "rider_payout": d.rider_payout, "platform_fee": d.platform_fee,
            "currency": d.currency, "ledger_reference": d.reference})
        timeline(d, DeliveryStatus.PENDING,
                 note=f"Pay on delivery — {money(d.fee, d.currency)} by card, transfer or cash.")

    @staticmethod
    def collect_cash(d) -> DeliveryRequest:
        """Rider confirms the customer paid the due amount in cash at the door."""
        if d.payment_status != DeliveryRequest.PaymentStatus.DUE:
            raise DeliveryError("This delivery doesn't have a payment due.", code="not_due", status=409)
        d.payment_status = DeliveryRequest.PaymentStatus.CASH
        d.save(update_fields=["payment_status", "updated_at"])
        timeline(d, d.status, note=f"{money(d.fee, d.currency)} collected in cash by the rider.", actor="rider")
        return d

    @staticmethod
    def pay_from_wallet(d):
        """Inside the create() transaction: hold the fee or fail the whole request."""
        from apps.wallet.exceptions import InsufficientFunds
        from apps.wallet.services import WalletService
        wallet = PaymentService._wallet(d.customer, d.currency)
        try:
            WalletService.hold(wallet, d.fee, reference=d.reference,
                               description=f"Delivery {d.reference}",
                               metadata={"module": "deliveries", "delivery": str(d.id)})
        except InsufficientFunds:
            raise DeliveryError(
                f"Your wallet balance is too low for this delivery ({money(d.fee, d.currency)}). "
                "Top up or pay by card.", code="insufficient_funds", status=402)
        PaymentService._mark_paid(d)

    @staticmethod
    def start_card_checkout(d, *, return_url=""):
        from integrations.base.exceptions import ProviderError
        gateway = PaymentService._gateway()
        attempt = DeliveryRequest.objects.filter(pk=d.pk).values_list("payment_reference", flat=True)[0]
        n = int(attempt.rsplit("-", 1)[-1]) + 1 if attempt and attempt.count("-") >= 2 else 1
        ref = f"{d.reference}-{n}"
        extra = {}
        base = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
        callback = return_url if return_url.startswith(("http://", "https://", "oam://")) else (
            f"{base}/deliveries/payment-return" if base else "")
        if callback and "callback_url" in inspect.signature(gateway.initialize_charge).parameters:
            extra["callback_url"] = callback
        try:
            init = gateway.initialize_charge(
                amount=d.fee, currency=d.currency, reference=ref,
                email=getattr(d.customer, "email", "") or f"{d.customer_id}@users.oam",
                metadata={"purpose": "delivery", "delivery": str(d.id), "user": str(d.customer_id),
                          "name": _name(d.customer), "phone": getattr(d.customer, "phone", "") or ""},
                **extra)
        except ProviderError as exc:
            raise DeliveryError(f"Could not start card payment: {exc}", code="gateway", status=502)
        DeliveryRequest.objects.filter(pk=d.pk).update(
            payment_reference=ref, payment_url=init.authorization_url or "",
            payment_provider=gateway.provider_key, updated_at=timezone.now())
        d.refresh_from_db()
        return d

    @staticmethod
    def confirm_card(d) -> DeliveryRequest:
        """Verify the card charge with the gateway, then credit + hold. Idempotent."""
        from integrations.base.dto import TxnStatus
        from integrations.base.exceptions import ProviderError
        from apps.wallet.services import WalletService
        open_cash_link = d.payment_status == DeliveryRequest.PaymentStatus.CASH and bool(d.payment_url)
        if (d.payment_status not in (DeliveryRequest.PaymentStatus.UNPAID, DeliveryRequest.PaymentStatus.DUE)
                and not open_cash_link) or not d.payment_reference:
            return d
        gateway = PaymentService._gateway(d.payment_provider or None)
        try:
            result = gateway.verify_charge(d.payment_reference)
        except ProviderError as exc:
            raise DeliveryError(f"Could not verify payment: {exc}", code="gateway", status=502)
        if result.status != TxnStatus.SUCCESS:
            return d
        reported = Decimal(str(getattr(result, "amount", 0) or 0))
        ccy = (getattr(result, "currency", "") or "").upper()
        is_mock = gateway.provider_key == "mock"
        if (ccy and ccy != d.currency) or (not is_mock and reported < d.fee):
            logger.error("delivery %s card mismatch: %s %s", d.reference, reported, ccy)
            return d
        with transaction.atomic():
            d = _locked(d.pk)
            if d.payment_status == DeliveryRequest.PaymentStatus.CASH:
                # Paid by link AND in cash: never keep both — the card money goes to their wallet.
                wallet = PaymentService._wallet(d.customer, d.currency)
                WalletService.credit(wallet, d.fee, source_code=f"gateway:{gateway.provider_key}",
                                     description=f"Card payment for {d.reference} (also paid in cash)",
                                     idempotency_key=f"dlv-card:{d.payment_reference}")
                d.payment_url = ""          # link settled; stop re-checking it
                d.save(update_fields=["payment_url", "updated_at"])
                notify(d.customer, title="Payment added to your wallet",
                       body=f"{d.reference} was also paid in cash, so the card payment of "
                            f"{money(d.fee, d.currency)} was added to your wallet.",
                       data={"type": "delivery.refunded", "delivery_id": str(d.id)})
                return d
            if d.payment_status not in (DeliveryRequest.PaymentStatus.UNPAID, DeliveryRequest.PaymentStatus.DUE):
                return d
            if d.status == DeliveryStatus.CANCELLED:
                # Paid after the request lapsed: money goes to the wallet, not lost.
                wallet = PaymentService._wallet(d.customer, d.currency)
                WalletService.credit(wallet, d.fee, source_code=f"gateway:{gateway.provider_key}",
                                     description=f"Card payment for cancelled {d.reference}",
                                     idempotency_key=f"dlv-card:{d.payment_reference}")
                d.payment_status = DeliveryRequest.PaymentStatus.REFUNDED
                d.save(update_fields=["payment_status", "updated_at"])
                notify(d.customer, title="Payment added to your wallet",
                       body=f"{d.reference} had already lapsed, so {money(d.fee, d.currency)} "
                            "was added to your wallet.",
                       data={"type": "delivery.refunded", "delivery_id": str(d.id)})
                return d
            wallet = PaymentService._wallet(d.customer, d.currency)
            WalletService.credit(wallet, d.fee, source_code=f"gateway:{gateway.provider_key}",
                                 description=f"Card payment for {d.reference}",
                                 idempotency_key=f"dlv-card:{d.payment_reference}")
            WalletService.hold(wallet, d.fee, reference=d.reference,
                               description=f"Delivery {d.reference}",
                               metadata={"module": "deliveries", "delivery": str(d.id)})
            PaymentService._mark_paid(d)
        dispatch.advance([d.pk])
        delivery_updated(d)
        return d

    @staticmethod
    def confirm_by_reference(reference: str) -> bool:
        """Webhook path (payments app forwards DLV- refs). Re-verifies with the gateway."""
        if not (reference or "").startswith("DLV-"):
            return False
        d = DeliveryRequest.objects.filter(payment_reference=reference).first()
        if d is None:
            return False
        try:
            PaymentService.confirm_card(d)
        except DeliveryError:
            logger.warning("delivery webhook verify failed for %s", reference)
        return True

    @staticmethod
    def refund(d) -> bool:
        """Release the hold back to the customer (caller holds the row lock)."""
        from apps.wallet.services import WalletService
        if d.payment_status != DeliveryRequest.PaymentStatus.PAID:
            return False
        wallet = PaymentService._wallet(d.customer, d.currency)
        WalletService.release(wallet, d.fee, reference=d.reference,
                              description=f"Refund for delivery {d.reference}")
        d.payment_status = DeliveryRequest.PaymentStatus.REFUNDED
        d.save(update_fields=["payment_status", "updated_at"])
        DeliveryTransaction.objects.filter(delivery=d).update(
            status=DeliveryTransaction.Status.REFUNDED, updated_at=timezone.now())
        return True

    @staticmethod
    def settle(d):
        """Split the held fee: rider payout to their wallet, commission to revenue."""
        from apps.wallet.services import WalletService
        if not d.rider_id:
            return
        if d.payment_status == DeliveryRequest.PaymentStatus.CASH:
            return PaymentService.settle_cash(d)
        if d.payment_status != DeliveryRequest.PaymentStatus.PAID:
            return
        WalletService.capture(d.currency, d.fee, reference=d.reference, cost=d.rider_payout,
                              counterpart_code=RIDER_CLEARING,
                              description=f"Delivery {d.reference} completed",
                              metadata={"module": "deliveries", "delivery": str(d.id)})
        rider_wallet = PaymentService._wallet(d.rider.user, d.currency)
        WalletService.credit(rider_wallet, d.rider_payout, source_code=RIDER_CLEARING,
                             description=f"Delivery earnings {d.reference}",
                             reference=f"{d.reference}:payout",
                             idempotency_key=f"dlv-payout:{d.reference}")
        now = timezone.now()
        d.payment_status = DeliveryRequest.PaymentStatus.SETTLED
        d.save(update_fields=["payment_status", "updated_at"])
        DeliveryTransaction.objects.filter(delivery=d).update(
            status=DeliveryTransaction.Status.SETTLED, rider=d.rider, settled_at=now, updated_at=now)
        RiderProfile.objects.filter(pk=d.rider_id).update(
            total_earnings=F("total_earnings") + d.rider_payout,
            completed_deliveries=F("completed_deliveries") + 1)
        txn_id = DeliveryTransaction.objects.filter(delivery=d).values_list("pk", flat=True).first()
        if txn_id:
            transaction.on_commit(lambda: PayoutService.send(txn_id))

    @staticmethod
    def settle_cash(d):
        """The rider kept the whole fee in cash; record OAM's share as owed."""
        now = timezone.now()
        DeliveryTransaction.objects.filter(delivery=d).update(
            status=DeliveryTransaction.Status.CASH_DUE, rider=d.rider, settled_at=now, updated_at=now)
        RiderProfile.objects.filter(pk=d.rider_id).update(
            total_earnings=F("total_earnings") + d.rider_payout,
            completed_deliveries=F("completed_deliveries") + 1,
            cash_commission_due=F("cash_commission_due") + d.platform_fee)


# --------------------------------------------------------------------------- #
# Rider payouts: 80% to the rider's bank, OAM's share of cash jobs back to OAM
# --------------------------------------------------------------------------- #

class PayoutService:
    @staticmethod
    def send(txn_id) -> str:
        """
        Transfer one delivery's rider payout from the rider's OAM wallet to their
        bank (apps.payouts: hold → Paystack transfer → capture, or refund on
        failure). No transfer fee: the full 80% reaches the bank. Never raises —
        if anything fails, the money simply stays in the rider's wallet.
        """
        t = (DeliveryTransaction.objects.select_related("rider__user", "rider__payout_account", "delivery")
             .filter(pk=txn_id).first())
        if t is None or t.status != DeliveryTransaction.Status.SETTLED or t.payout_status not in (
                DeliveryTransaction.Payout.NONE, DeliveryTransaction.Payout.FAILED):
            return t.payout_status if t else ""
        rider = t.rider
        acct = rider.payout_account if rider else None
        if not rider or not rider.auto_payout or not acct or not acct.recipient_code or not acct.is_active:
            DeliveryTransaction.objects.filter(pk=t.pk).update(payout_status=DeliveryTransaction.Payout.WALLET)
            return DeliveryTransaction.Payout.WALLET
        try:
            from apps.payouts.services import WithdrawalService
            order = WithdrawalService.withdraw(user=rider.user, bank_account=acct, amount=t.rider_payout,
                                               currency=t.currency, fee=Decimal("0"))
            status = {"success": DeliveryTransaction.Payout.SENT, "failed": DeliveryTransaction.Payout.FAILED,
                      "reversed": DeliveryTransaction.Payout.FAILED}.get(order.status, DeliveryTransaction.Payout.PROCESSING)
            ref = order.reference
        except Exception:
            logger.exception("delivery payout %s failed to start", t.ledger_reference)
            status, ref = DeliveryTransaction.Payout.FAILED, t.payout_reference
        DeliveryTransaction.objects.filter(pk=t.pk).update(payout_status=status, payout_reference=ref or "")
        bank = f"{acct.bank_name or 'your bank'} ({acct.account_number[-4:]})"
        if status == DeliveryTransaction.Payout.SENT:
            notify(rider.user, title=f"{money(t.rider_payout, t.currency)} sent to your bank",
                   body=f"Earnings for {t.delivery.reference} were transferred to {bank}.",
                   data={"type": "delivery.payout", "delivery_id": str(t.delivery_id)})
        elif status == DeliveryTransaction.Payout.FAILED:
            notify(rider.user, title="Bank transfer didn't go through",
                   body=f"{money(t.rider_payout, t.currency)} for {t.delivery.reference} is in your OAM wallet. "
                        "Check your bank details or withdraw from the wallet.",
                   data={"type": "delivery.payout_failed", "delivery_id": str(t.delivery_id)})
        return status

    @staticmethod
    def sync_processing() -> int:
        """Pick up the final state of transfers the payouts webhook has resolved."""
        from apps.payouts.models import WithdrawalOrder
        n = 0
        for t in DeliveryTransaction.objects.filter(payout_status=DeliveryTransaction.Payout.PROCESSING)[:200]:
            o = WithdrawalOrder.objects.filter(reference=t.payout_reference).only("status").first()
            if not o:
                continue
            new = {"success": DeliveryTransaction.Payout.SENT, "failed": DeliveryTransaction.Payout.FAILED,
                   "reversed": DeliveryTransaction.Payout.FAILED}.get(o.status)
            if new:
                DeliveryTransaction.objects.filter(pk=t.pk).update(payout_status=new)
                n += 1
        return n

    @staticmethod
    def _clear_commission(rider, amount, *, note):
        """Reduce what the rider owes; once fully paid, close their cash jobs."""
        now = timezone.now()
        r = RiderProfile.objects.select_for_update().get(pk=rider.pk)
        r.cash_commission_due = max(Decimal("0"), r.cash_commission_due - amount)
        r.save(update_fields=["cash_commission_due", "updated_at"])
        if r.cash_commission_due == 0:
            DeliveryTransaction.objects.filter(rider=r, status=DeliveryTransaction.Status.CASH_DUE).update(
                status=DeliveryTransaction.Status.SETTLED, commission_paid_at=now,
                payout_status=DeliveryTransaction.Payout.NONE, updated_at=now)
        logger.info("rider %s commission -%s (%s)", r.pk, amount, note)
        return r

    @staticmethod
    def pay_commission_from_wallet(rider) -> RiderProfile:
        """Rider settles OAM's cash share from their OAM wallet balance."""
        from apps.wallet.exceptions import InsufficientFunds
        from apps.wallet.services import REVENUE_ACCOUNT, WalletService
        owed = rider.cash_commission_due
        if owed <= 0:
            raise DeliveryError("You don't owe any commission.", code="nothing_due")
        wallet = WalletService.get_or_create_wallet(rider.user, "NGN")
        ref = f"DLVCOM-{uuid.uuid4().hex[:12].upper()}"
        with transaction.atomic():
            try:
                WalletService.hold(wallet, owed, reference=ref, description="Delivery commission to OAM")
            except InsufficientFunds:
                raise DeliveryError(f"Your wallet balance is below {money(owed)}. Top up, or transfer to OAM's bank account.",
                                    code="insufficient_funds", status=402)
            WalletService.capture("NGN", owed, reference=ref, cost=owed, counterpart_code=REVENUE_ACCOUNT,
                                  description="Delivery commission (cash jobs)")
            r = PayoutService._clear_commission(rider, owed, note=f"wallet {ref}")
        notify(rider.user, title="Commission paid", body=f"{money(owed)} paid to OAM from your wallet. Thank you!",
               data={"type": "rider.commission_paid"})
        return r

    @staticmethod
    def record_commission(*, rider_id, amount, admin=None) -> RiderProfile:
        """Admin confirms a bank transfer from the rider into OAM's account."""
        from apps.wallet.models import LedgerAccount, LedgerPosting
        from apps.wallet.services import REVENUE_ACCOUNT, WalletService
        amount = Decimal(str(amount))
        if amount <= 0:
            raise DeliveryError("Enter the amount received.")
        rider = RiderProfile.objects.filter(pk=rider_id).first()
        if rider is None:
            raise DeliveryError("Rider not found.", code="not_found", status=404)
        with transaction.atomic():
            # Book it as OAM revenue received into the company bank account.
            bank = WalletService.system_account("cash:oam_bank", "NGN", LedgerAccount.Type.ASSET)
            revenue = WalletService.system_account(REVENUE_ACCOUNT, "NGN", LedgerAccount.Type.LIABILITY)
            WalletService.post(currency="NGN", description=f"Rider commission received ({rider.full_name})",
                               lines=[(bank, LedgerPosting.Direction.DEBIT, amount),
                                      (revenue, LedgerPosting.Direction.CREDIT, amount)],
                               metadata={"rider": str(rider.pk), "by": str(getattr(admin, "pk", ""))})
            r = PayoutService._clear_commission(rider, amount, note="bank transfer")
        notify(rider.user, title="Commission received", body=f"OAM received {money(amount)}. Thank you!",
               data={"type": "rider.commission_paid"})
        return r


# --------------------------------------------------------------------------- #
# Riders
# --------------------------------------------------------------------------- #

class RiderService:
    @staticmethod
    def apply(*, user, data, documents) -> RiderProfile:
        profile = RiderProfile.objects.filter(user=user).first()
        if profile and profile.verification_status in (RiderProfile.Verification.APPROVED,
                                                       RiderProfile.Verification.SUSPENDED):
            raise DeliveryError("You already have a rider profile.", code="exists", status=409)
        with transaction.atomic():
            if profile is None:
                profile = RiderProfile(user=user)
            for k in ("full_name", "phone", "city", "photo_url", "vehicle_type", "vehicle_plate",
                      "vehicle_description"):
                if k in data:
                    setattr(profile, k, data[k])
            profile.verification_status = RiderProfile.Verification.PENDING
            profile.review_note = ""
            profile.save()
            if data.get("bank_code") and data.get("account_number"):
                RiderService.set_bank(profile, data["bank_code"], data["account_number"])
            if documents:
                profile.documents.filter(kind__in=[doc["kind"] for doc in documents]).delete()
                RiderDocument.objects.bulk_create(
                    [RiderDocument(rider=profile, kind=doc["kind"], url=doc["url"],
                                   note=doc.get("note", "")) for doc in documents])
        notify(user, title="Rider application received",
               body="We're reviewing your documents. You'll be notified once you're approved.",
               data={"type": "rider.applied"})
        return profile

    @staticmethod
    def set_bank(rider, bank_code, account_number) -> RiderProfile:
        """Verify the account with the bank (name lookup) and save it for payouts."""
        from apps.payouts.services import WithdrawalError, WithdrawalService
        try:
            acct = WithdrawalService.add_bank_account(user=rider.user, bank_code=bank_code,
                                                      account_number=account_number)
        except WithdrawalError as exc:
            raise DeliveryError(f"We couldn't verify that bank account: {exc}", code="bank_invalid")
        rider.payout_account = acct
        rider.save(update_fields=["payout_account", "updated_at"])
        return rider

    @staticmethod
    def review(*, admin, rider_id, action, note="") -> RiderProfile:
        transitions = {
            "approve": RiderProfile.Verification.APPROVED,
            "reject": RiderProfile.Verification.REJECTED,
            "suspend": RiderProfile.Verification.SUSPENDED,
            "reinstate": RiderProfile.Verification.APPROVED,
        }
        if action not in transitions:
            raise DeliveryError("Unknown action.")
        with transaction.atomic():
            rider = RiderProfile.objects.select_for_update().select_related("user").filter(
                pk=rider_id).first()
            if rider is None:
                raise DeliveryError("Rider not found.", code="not_found", status=404)
            if action == "reinstate" and rider.verification_status != RiderProfile.Verification.SUSPENDED:
                raise DeliveryError("Only suspended riders can be reinstated.")
            rider.verification_status = transitions[action]
            rider.review_note = (note or "")[:300]
            rider.reviewed_at, rider.reviewed_by = timezone.now(), admin
            if action in ("reject", "suspend"):
                rider.availability = RiderProfile.Availability.OFFLINE
                rider.offers.filter(status=DispatchOffer.Status.OFFERED).update(
                    status=DispatchOffer.Status.WITHDRAWN, responded_at=timezone.now())
            rider.save()
        messages = {
            "approve": ("You're approved to ride!", "Go online in the Rider app to start receiving deliveries."),
            "reinstate": ("Your rider account is active again", "Go online to receive deliveries."),
            "reject": ("Rider application not approved", note or "Please check your documents and apply again."),
            "suspend": ("Rider account suspended", note or "Contact support for details."),
        }
        title, body = messages[action]
        notify(rider.user, title=title, body=body, data={"type": f"rider.{action}"}, email=True)
        broadcast([rider.user_id], "rider.updated", {"verification_status": rider.verification_status})
        return rider

    @staticmethod
    def set_availability(*, rider, online, lat=None, lng=None) -> RiderProfile:
        if online:
            if rider.verification_status != RiderProfile.Verification.APPROVED:
                raise DeliveryError("Your rider account isn't approved yet.", code="not_approved",
                                    status=403)
            if lat is None and rider.lat is None:
                raise DeliveryError("Turn on location so we can send you nearby requests.",
                                    code="location_required")
        now = timezone.now()
        rider.availability = (RiderProfile.Availability.ONLINE if online
                              else RiderProfile.Availability.OFFLINE)
        fields = ["availability", "updated_at"]
        if lat is not None and lng is not None:
            rider.lat, rider.lng, rider.location_updated_at = lat, lng, now
            fields += ["lat", "lng", "location_updated_at"]
        rider.save(update_fields=fields)
        if not online:
            stale = rider.offers.filter(status=DispatchOffer.Status.OFFERED)
            ids = list(stale.values_list("delivery_id", flat=True))
            stale.update(status=DispatchOffer.Status.EXPIRED, responded_at=now)
            if ids:
                dispatch.advance(ids)
        else:
            dispatch.advance()          # anything waiting near me?
        return rider

    @staticmethod
    def update_location(*, rider, lat, lng) -> RiderProfile:
        now = timezone.now()
        RiderProfile.objects.filter(pk=rider.pk).update(lat=lat, lng=lng, location_updated_at=now)
        rider.lat, rider.lng, rider.location_updated_at = lat, lng, now
        active = (DeliveryRequest.objects.filter(rider=rider, status__in=ACTIVE_STATUSES)
                  .only("id", "customer_id").first())
        if active:
            broadcast([active.customer_id], "delivery.rider_location",
                      {"delivery_id": str(active.id), "lat": lat, "lng": lng, "at": now})
        return rider

    @staticmethod
    def offers(rider):
        dispatch.advance_throttled()
        return (DispatchOffer.objects.filter(rider=rider, status=DispatchOffer.Status.OFFERED,
                                             expires_at__gt=timezone.now())
                .select_related("delivery"))

    @staticmethod
    def accept(*, rider, offer_id) -> DeliveryRequest:
        now = timezone.now()
        with transaction.atomic():
            offer = (DispatchOffer.objects.select_for_update().filter(pk=offer_id, rider=rider)
                     .first())
            if offer is None:
                raise DeliveryError("Request not found.", code="not_found", status=404)
            if offer.status != DispatchOffer.Status.OFFERED or offer.expires_at <= now:
                raise DeliveryError("This request is no longer available.", code="offer_gone",
                                    status=409)
            rider = RiderProfile.objects.select_for_update().get(pk=rider.pk)
            if not rider.is_dispatchable:
                raise DeliveryError("Go online to accept requests.", code="offline", status=403)
            if DeliveryRequest.objects.filter(rider=rider, status__in=ACTIVE_STATUSES).exists():
                raise DeliveryError("Finish your current delivery first.", code="busy", status=409)
            d = _locked(offer.delivery_id)
            if d.status != DeliveryStatus.PENDING or d.rider_id:
                offer.status, offer.responded_at = DispatchOffer.Status.WITHDRAWN, now
                offer.save(update_fields=["status", "responded_at"])
                raise DeliveryError("Another rider took this request.", code="taken", status=409)
            d.rider, d.status, d.accepted_at = rider, DeliveryStatus.ACCEPTED, now
            d.save(update_fields=["rider", "status", "accepted_at", "updated_at"])
            offer.status, offer.responded_at = DispatchOffer.Status.ACCEPTED, now
            offer.save(update_fields=["status", "responded_at"])
            others = list(d.offers.filter(status=DispatchOffer.Status.OFFERED)
                          .exclude(pk=offer.pk).values_list("rider__user_id", flat=True))
            d.offers.filter(status=DispatchOffer.Status.OFFERED).exclude(pk=offer.pk).update(
                status=DispatchOffer.Status.WITHDRAWN, responded_at=now)
            DeliveryTransaction.objects.filter(delivery=d).update(rider=rider)
            timeline(d, DeliveryStatus.ACCEPTED, note=f"{rider.full_name} accepted.", actor="rider",
                     lat=rider.lat, lng=rider.lng)
        if others:
            broadcast(others, "delivery.offer_withdrawn", {"delivery_id": str(d.id)})
        vehicle = rider.vehicle_description or rider.get_vehicle_type_display()
        notify(d.customer, title="Rider found",
               body=f"{rider.full_name} ({vehicle}) is heading to pick up {d.reference}.",
               data={"type": "delivery.accepted", "delivery_id": str(d.id)})
        delivery_updated(d)
        return d

    @staticmethod
    def reject(*, rider, offer_id) -> None:
        with transaction.atomic():
            offer = DispatchOffer.objects.select_for_update().filter(pk=offer_id, rider=rider).first()
            if offer is None:
                raise DeliveryError("Request not found.", code="not_found", status=404)
            if offer.status == DispatchOffer.Status.OFFERED:
                offer.status, offer.responded_at = DispatchOffer.Status.REJECTED, timezone.now()
                offer.save(update_fields=["status", "responded_at"])
            delivery_id = offer.delivery_id
        dispatch.advance([delivery_id])

    @staticmethod
    def _own_active(rider, delivery_id) -> DeliveryRequest:
        d = _locked(delivery_id)
        if d.rider_id != rider.id:
            raise DeliveryError("Delivery not found.", code="not_found", status=404)
        return d

    @staticmethod
    def pickup(*, rider, delivery_id, photo_url="", lat=None, lng=None) -> DeliveryRequest:
        with transaction.atomic():
            d = RiderService._own_active(rider, delivery_id)
            if d.status != DeliveryStatus.ACCEPTED:
                raise DeliveryError("This delivery isn't waiting for pickup.", code="bad_state",
                                    status=409)
            d.status, d.picked_up_at = DeliveryStatus.PICKED_UP, timezone.now()
            d.save(update_fields=["status", "picked_up_at", "updated_at"])
            timeline(d, DeliveryStatus.PICKED_UP, note="Package collected." + (
                " Photo attached." if photo_url else ""), actor="rider", lat=lat, lng=lng)
        notify(d.customer, title="Package picked up",
               body=f"{rider.full_name} has collected {d.reference}.",
               data={"type": "delivery.picked_up", "delivery_id": str(d.id)})
        delivery_updated(d)
        return d

    @staticmethod
    def start(*, rider, delivery_id, lat=None, lng=None) -> DeliveryRequest:
        with transaction.atomic():
            d = RiderService._own_active(rider, delivery_id)
            if d.status != DeliveryStatus.PICKED_UP:
                raise DeliveryError("Confirm pickup first.", code="bad_state", status=409)
            d.status, d.in_transit_at = DeliveryStatus.IN_TRANSIT, timezone.now()
            d.save(update_fields=["status", "in_transit_at", "updated_at"])
            timeline(d, DeliveryStatus.IN_TRANSIT, note="On the way to the recipient.", actor="rider",
                     lat=lat, lng=lng)
        notify(d.customer, title="Your package is on the way",
               body=f"Heading to {d.recipient_name}. Share code {d.delivery_code} with them.",
               data={"type": "delivery.in_transit", "delivery_id": str(d.id)})
        delivery_updated(d)
        return d

    @staticmethod
    def deliver(*, rider, delivery_id, code="", photo_url="", lat=None, lng=None) -> DeliveryRequest:
        attempts_key = f"deliveries:code:{delivery_id}"
        with transaction.atomic():
            d = RiderService._own_active(rider, delivery_id)
            if d.status not in (DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT):
                raise DeliveryError("Confirm pickup first.", code="bad_state", status=409)
            if d.payment_status == DeliveryRequest.PaymentStatus.DUE:
                if d.payment_reference:
                    PaymentService.confirm_card(d)
                    d.refresh_from_db()
                if d.payment_status == DeliveryRequest.PaymentStatus.DUE:
                    raise DeliveryError(f"Collect {money(d.fee, d.currency)} first — send the payment link "
                                        "or confirm cash.", code="payment_due", status=402)
            code = (code or "").strip()
            if code:
                tries = cache.get(attempts_key, 0)
                if tries >= MAX_CODE_ATTEMPTS:
                    raise DeliveryError("Too many wrong codes. Take a photo of the handover instead.",
                                        code="code_locked", status=429)
                if not hmac.compare_digest(code, d.delivery_code):
                    cache.set(attempts_key, tries + 1, 3600)
                    raise DeliveryError("That code doesn't match. Ask the recipient again.",
                                        code="bad_code")
            elif not photo_url:
                raise DeliveryError("Enter the recipient's 4-digit code or attach a photo.",
                                    code="proof_required")
            now = timezone.now()
            if d.status == DeliveryStatus.PICKED_UP:
                d.in_transit_at = now
            d.status, d.delivered_at = DeliveryStatus.DELIVERED, now
            d.proof_photo_url = photo_url or ""
            d.save(update_fields=["status", "delivered_at", "in_transit_at", "proof_photo_url",
                                  "updated_at"])
            PaymentService.settle(d)
            timeline(d, DeliveryStatus.DELIVERED, note="Delivered" + (
                " (code confirmed)." if code else " (photo proof)."), actor="rider", lat=lat, lng=lng)
        cache.delete(attempts_key)
        notify(d.customer, title="Delivered 🎉",
               body=f"{d.reference} was delivered to {d.recipient_name}. Rate your rider!",
               data={"type": "delivery.delivered", "delivery_id": str(d.id)})
        notify(rider.user, title=f"You earned {money(d.rider_payout, d.currency)}",
               body=f"Delivery {d.reference} completed — the money is in your wallet.",
               data={"type": "delivery.earned", "delivery_id": str(d.id)})
        delivery_updated(d)
        return d

    @staticmethod
    def release(*, rider, delivery_id, reason="") -> DeliveryRequest:
        """Rider can't make it (before pickup) → back to the pool."""
        with transaction.atomic():
            d = RiderService._own_active(rider, delivery_id)
            if d.status != DeliveryStatus.ACCEPTED:
                raise DeliveryError("You can only hand back a delivery before pickup.",
                                    code="bad_state", status=409)
            d.offers.filter(rider=rider).update(status=DispatchOffer.Status.WITHDRAWN)
            d.rider, d.status, d.accepted_at = None, DeliveryStatus.PENDING, None
            d.dispatch_exhausted = False
            d.save(update_fields=["rider", "status", "accepted_at", "dispatch_exhausted", "updated_at"])
            DeliveryTransaction.objects.filter(delivery=d).update(rider=None)
            timeline(d, DeliveryStatus.PENDING, note="Rider handed it back — finding another rider.",
                     actor="rider")
        notify(d.customer, title="Finding you another rider",
               body=f"Your rider couldn't make it for {d.reference}. We're matching a new one.",
               data={"type": "delivery.reassigning", "delivery_id": str(d.id)})
        dispatch.advance([d.pk])
        delivery_updated(d)
        return d

    @staticmethod
    def earnings(rider) -> dict:
        from apps.wallet.services import WalletService
        wallet = WalletService.get_or_create_wallet(rider.user, "NGN")
        now = timezone.localtime()
        day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week0 = day0 - timedelta(days=day0.weekday())
        settled = DeliveryTransaction.objects.filter(
            rider=rider, status__in=[DeliveryTransaction.Status.SETTLED, DeliveryTransaction.Status.CASH_DUE])
        cfg = DispatchSettings.load()
        acct = rider.payout_account

        def total(qs):
            return qs.aggregate(s=Sum("rider_payout"))["s"] or Decimal("0")

        return {
            "currency": "NGN",
            "wallet_balance": wallet.cached_balance,
            "total_earnings": rider.total_earnings,
            "completed_deliveries": rider.completed_deliveries,
            "today": total(settled.filter(settled_at__gte=day0)),
            "this_week": total(settled.filter(settled_at__gte=week0)),
            "today_count": settled.filter(settled_at__gte=day0).count(),
            "rating_avg": rider.rating_avg, "rating_count": rider.rating_count,
            "auto_payout": rider.auto_payout,
            "payout_account": ({"bank_name": acct.bank_name, "account_name": acct.account_name,
                                "account_number": "•" * 6 + acct.account_number[-4:]} if acct else None),
            "cash_commission_due": rider.cash_commission_due,
            "cash_debt_limit": cfg.cash_debt_limit,
            "oam_bank": ({"bank_name": cfg.oam_bank_name, "account_number": cfg.oam_account_number,
                          "account_name": cfg.oam_account_name} if cfg.oam_account_number else None),
            "ledger": [
                {"reference": t.delivery.reference, "delivery_id": str(t.delivery_id),
                 "gross_amount": t.gross_amount, "rider_payout": t.rider_payout,
                 "platform_fee": t.platform_fee, "currency": t.currency,
                 "settled_at": t.settled_at, "dropoff_address": t.delivery.dropoff_address,
                 "payment_method": t.delivery.payment_method, "status": t.status,
                 "payout_status": t.payout_status, "payout_label": t.get_payout_status_display()}
                for t in settled.select_related("delivery").order_by("-settled_at")[:50]
            ],
        }


# --------------------------------------------------------------------------- #
# Admin + maintenance
# --------------------------------------------------------------------------- #

class AdminService:
    @staticmethod
    def overview() -> dict:
        now = timezone.now()
        day0 = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        by_status = dict(DeliveryRequest.objects.values_list("status").annotate(n=Count("id")))
        today = DeliveryRequest.objects.filter(created_at__gte=day0)
        settled_today = DeliveryTransaction.objects.filter(status=DeliveryTransaction.Status.SETTLED,
                                                           settled_at__gte=day0)
        riders = RiderProfile.objects.values_list("verification_status").annotate(n=Count("id"))
        online = RiderProfile.objects.filter(
            verification_status=RiderProfile.Verification.APPROVED,
            availability=RiderProfile.Availability.ONLINE, lat__isnull=False)
        busy_ids = set(DeliveryRequest.objects.filter(status__in=ACTIVE_STATUSES)
                       .values_list("rider_id", flat=True))
        active = (DeliveryRequest.objects.filter(
            Q(status__in=ACTIVE_STATUSES) | Q(status=DeliveryStatus.PENDING,
                                              payment_status__in=DISPATCHABLE_PAYMENT))
            .select_related("rider")[:200])
        return {
            "deliveries_by_status": by_status,
            "riders_by_status": dict(riders),
            "today": {
                "requests": today.count(),
                "delivered": today.filter(status=DeliveryStatus.DELIVERED).count(),
                "gmv": settled_today.aggregate(s=Sum("gross_amount"))["s"] or Decimal("0"),
                "platform_revenue": settled_today.aggregate(s=Sum("platform_fee"))["s"] or Decimal("0"),
                "rider_payouts": settled_today.aggregate(s=Sum("rider_payout"))["s"] or Decimal("0"),
            },
            "unassigned_over_5_min": DeliveryRequest.objects.filter(
                status=DeliveryStatus.PENDING, payment_status__in=DISPATCHABLE_PAYMENT,
                created_at__lte=now - timedelta(minutes=5)).count(),
            "online_riders": [
                {"id": str(r.id), "name": r.full_name, "lat": r.lat, "lng": r.lng,
                 "vehicle_type": r.vehicle_type, "busy": r.id in busy_ids,
                 "location_updated_at": r.location_updated_at}
                for r in online[:500]
            ],
            "active_deliveries": [
                {"id": str(d.id), "reference": d.reference, "status": d.status,
                 "pickup_lat": d.pickup_lat, "pickup_lng": d.pickup_lng,
                 "dropoff_lat": d.dropoff_lat, "dropoff_lng": d.dropoff_lng,
                 "rider_name": d.rider.full_name if d.rider else "",
                 "rider_lat": d.rider.lat if d.rider else None,
                 "rider_lng": d.rider.lng if d.rider else None}
                for d in active
            ],
        }

    @staticmethod
    def redispatch(delivery_id) -> DeliveryRequest:
        with transaction.atomic():
            d = _locked(delivery_id)
            if d.status != DeliveryStatus.PENDING:
                raise DeliveryError("Only unassigned deliveries can be re-dispatched.", status=409)
            now = timezone.now()
            d.offers.filter(status=DispatchOffer.Status.OFFERED).update(
                status=DispatchOffer.Status.WITHDRAWN, responded_at=now)
            # Give everyone another chance: forget past offers, restart at round 1.
            d.offers.exclude(status=DispatchOffer.Status.ACCEPTED).delete()
            d.dispatch_round, d.dispatch_exhausted = 0, False
            d.save(update_fields=["dispatch_round", "dispatch_exhausted", "updated_at"])
            timeline(d, DeliveryStatus.PENDING, note="Re-dispatched by support.", actor="admin")
        dispatch.advance([d.pk])
        d.refresh_from_db()
        return d


class MaintenanceService:
    @staticmethod
    def tick() -> dict:
        out = {"offers": dispatch.advance(limit=200), "payouts_synced": PayoutService.sync_processing()}
        now = timezone.now()
        # Paid but nobody accepted for too long → cancel + refund.
        lapsed = DeliveryRequest.objects.filter(
            status=DeliveryStatus.PENDING, payment_status__in=DISPATCHABLE_PAYMENT,
            created_at__lte=now - timedelta(minutes=PENDING_TIMEOUT_MIN)).values_list("pk", flat=True)
        n = 0
        for pk in list(lapsed[:100]):
            try:
                CustomerService.cancel(delivery_id=pk, by="system",
                                       reason="No rider was available — you've been refunded.")
                n += 1
            except DeliveryError:
                pass
        out["auto_cancelled"] = n
        # Card checkouts: reconcile recent ones, cancel abandoned ones.
        unpaid = DeliveryRequest.objects.filter(
            status=DeliveryStatus.PENDING, payment_status=DeliveryRequest.PaymentStatus.UNPAID,
            payment_method=DeliveryRequest.PaymentMethod.CARD)
        open_links = DeliveryRequest.objects.filter(
            Q(payment_status__in=[DeliveryRequest.PaymentStatus.UNPAID, DeliveryRequest.PaymentStatus.DUE],
              status__in=[DeliveryStatus.PENDING, *ACTIVE_STATUSES])
            | Q(payment_status=DeliveryRequest.PaymentStatus.CASH,
                payment_method=DeliveryRequest.PaymentMethod.ON_DELIVERY,
                created_at__gte=now - timedelta(days=2)) & ~Q(payment_url=""))
        checked = 0
        for d in open_links.exclude(payment_reference="").filter(
                created_at__lte=now - timedelta(minutes=2))[:20]:
            try:
                PaymentService.confirm_card(d)
                checked += 1
            except DeliveryError:
                pass
        out["card_checked"] = checked
        abandoned = unpaid.filter(created_at__lte=now - timedelta(minutes=UNPAID_TIMEOUT_MIN))
        out["abandoned"] = abandoned.update(
            status=DeliveryStatus.CANCELLED, cancelled_at=now, cancelled_by="system",
            cancel_reason="Payment wasn't completed.", updated_at=now)
        return out
