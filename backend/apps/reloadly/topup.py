"""
Airtime top-up orchestration.

Pricing uses Reloadly's LIVE fx.rate only — no markup, no static USD->NGN rate,
no discount adjustment. The customer is charged the face value converted at
Reloadly's own rate:

    - local amount   -> charge_ngn = amount / fx.rate   (recipient currency -> merchant NGN)
    - sender amount   -> charge_ngn = amount             (already in the merchant currency)

OAM's profit is earned automatically by Reloadly's merchant discount, which is
applied to the OAM Reloadly account balance at settlement — NOT added to the
customer's charge here.
"""
import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from apps.wallet.services import WalletService
from apps.payments.services import FundingService

from .services import ReloadlyClient, ReloadlyError, s as _s
from .models import AirtimeTopup, AirtimeApiLog

logger = logging.getLogger(__name__)

RELOADLY_ACCOUNT = "provider:reloadly"   # OAM's Reloadly float (settlement account)


def _ref() -> str:
    return f"AIR-{uuid.uuid4().hex[:20]}"


def _d(v) -> Decimal:
    try:
        return Decimal(str(v))
    except Exception:
        return Decimal("0")


class AirtimeTopupService:
    @staticmethod
    def quote(*, operator: dict, amount, use_local_amount=False) -> dict:
        """Charge in the merchant currency (NGN) using Reloadly's live fx.rate only."""
        fx = _d(operator.get("fx_rate"))
        amt = _d(amount)
        if use_local_amount and fx > 0:
            # recipient's local currency -> merchant currency (NGN) at Reloadly's rate
            total_ngn = (amt / fx).quantize(Decimal("0.01"), ROUND_HALF_UP)
        else:
            # amount already expressed in the merchant/sender currency
            total_ngn = amt.quantize(Decimal("0.01"), ROUND_HALF_UP)
        return {
            "total_ngn": total_ngn,
            "fx_rate": fx,
            "use_local_amount": bool(use_local_amount),
        }

    @staticmethod
    @transaction.atomic
    def create_topup(*, user, operator_id, amount, recipient_number, recipient_iso2,
                     use_local_amount=False, pay_with="wallet") -> AirtimeTopup:
        client = ReloadlyClient()
        op = client.normalize_operator(client.operator(operator_id))
        if not op.get("operator_id"):
            raise ReloadlyError("That operator is not available.")
        q = AirtimeTopupService.quote(operator=op, amount=amount, use_local_amount=use_local_amount)
        return AirtimeTopup.objects.create(
            user=user, reference=_ref(), status=AirtimeTopup.Status.PENDING,
            operator_id=_s(operator_id), operator_name=op.get("name", ""),
            country_iso=op.get("country_iso", ""),
            recipient_number=_s(recipient_number), recipient_iso2=_s(recipient_iso2).upper(),
            use_local_amount=bool(use_local_amount),
            amount=_d(amount), currency=op.get("sender_currency", "NGN") or "NGN",
            total_ngn=q["total_ngn"], cost_ngn=q["total_ngn"], markup_ngn=Decimal("0"),
            pay_with=pay_with,
            request_payload={"operator": op.get("name"),
                             "quote": {k: str(v) for k, v in q.items()}},
        )

    # ---------------- payment ----------------
    @staticmethod
    def pay_with_wallet(topup: AirtimeTopup) -> AirtimeTopup:
        topup.status = AirtimeTopup.Status.PAID
        topup.save(update_fields=["status", "updated_at"])
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        WalletService.hold(wallet, topup.total_ngn, reference=topup.reference,
                           description=f"Airtime {topup.reference}",
                           metadata={"airtime": str(topup.id)})
        return AirtimeTopupService._fulfill(topup)

    @staticmethod
    def pay_with_card(topup: AirtimeTopup) -> str:
        txn, init = FundingService.initialize(topup.user, topup.total_ngn, "NGN")
        topup.payment_reference = txn.internal_reference
        topup.save(update_fields=["payment_reference", "updated_at"])
        return init.authorization_url

    @staticmethod
    def settle_card(*, user, reference: str) -> AirtimeTopup:
        topup = AirtimeTopup.objects.filter(payment_reference=reference, user=user).first()
        if topup is None:
            raise ReloadlyError("Unknown top-up reference.")
        FundingService.settle(reference)   # credits wallet + fires on_funding_settled
        topup.refresh_from_db()
        return topup

    @staticmethod
    def on_funding_settled(reference: str):
        with transaction.atomic():
            topup = (AirtimeTopup.objects.select_for_update()
                     .filter(payment_reference=reference,
                             status=AirtimeTopup.Status.PENDING).first())
            if topup is None:
                return
            topup.status = AirtimeTopup.Status.PAID
            topup.save(update_fields=["status", "updated_at"])
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        WalletService.hold(wallet, topup.total_ngn, reference=topup.reference,
                           description=f"Airtime {topup.reference}",
                           metadata={"airtime": str(topup.id)})
        AirtimeTopupService._fulfill(topup)

    # ---------------- core: send + settle / refund ----------------
    @staticmethod
    def _fulfill(topup: AirtimeTopup) -> AirtimeTopup:
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        client = ReloadlyClient()
        try:
            result = client.topup(
                operator_id=topup.operator_id, amount=topup.amount,
                recipient_number=topup.recipient_number, recipient_iso2=topup.recipient_iso2,
                use_local_amount=topup.use_local_amount, custom_identifier=topup.reference,
            )
        except ReloadlyError as exc:
            AirtimeApiLog.objects.create(topup=topup, endpoint="topups", ok=False, error=str(exc)[:255])
            return AirtimeTopupService._refund(topup, wallet, str(exc)[:255])

        AirtimeApiLog.objects.create(topup=topup, endpoint="topups", ok=True,
                                     response_payload=result if isinstance(result, dict) else {})
        status_ = str((result or {}).get("status") or "").upper()
        txid = _s((result or {}).get("transactionId") or (result or {}).get("id"))
        if status_ in ("SUCCESSFUL", "PROCESSING", "PENDING") or txid:
            # Debit the customer's charge to the Reloadly float. OAM's margin is the
            # merchant discount Reloadly applies to the account balance (external).
            WalletService.capture(
                "NGN", topup.total_ngn, reference=topup.reference, cost=topup.total_ngn,
                counterpart_code=RELOADLY_ACCOUNT, description=f"Airtime {topup.reference}",
                metadata={"airtime": str(topup.id)},
            )
            topup.status = AirtimeTopup.Status.SUCCESS
            topup.reloadly_transaction_id = txid
            topup.delivered_amount = _d((result or {}).get("deliveredAmount"))
            topup.delivered_currency = _s((result or {}).get("deliveredAmountCurrencyCode"))
            topup.response_payload = result if isinstance(result, dict) else {}
            topup.save(update_fields=["status", "reloadly_transaction_id", "delivered_amount",
                                      "delivered_currency", "response_payload", "updated_at"])
            return topup

        return AirtimeTopupService._refund(topup, wallet,
                                           _s((result or {}).get("message")) or "Top-up not completed.")

    @staticmethod
    def _refund(topup: AirtimeTopup, wallet, reason: str) -> AirtimeTopup:
        WalletService.release(wallet, topup.total_ngn, reference=topup.reference,
                              description=f"Airtime refund {topup.reference}",
                              metadata={"airtime": str(topup.id)})
        topup.status = AirtimeTopup.Status.FAILED
        topup.failure_reason = reason
        topup.save(update_fields=["status", "failure_reason", "updated_at"])
        return topup
