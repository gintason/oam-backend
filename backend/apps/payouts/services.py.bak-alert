"""
WithdrawalService — money OUT to a bank via the transfers provider.

Same safety pattern as bills:
  1) create order + HOLD funds   (atomic; balance drops, overdraft-blocked)
  2) initiate the transfer        (external; outside the DB transaction)
  3) SUCCESS -> CAPTURE (funds leave to the bank)
     FAILED  -> RELEASE (refund the wallet)
     PENDING -> keep the hold; webhook resolves it
     QUEUED  -> keep the hold; OAM's transfer balance can't cover it yet.
                process_queue() retries (cron / admin / after each withdrawal)
                and sends it the moment the balance is topped up.
"""
from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from integrations.base import ProviderFactory
from integrations.base.exceptions import ProviderError
from apps.wallet.services import WalletService

from .models import BankAccount, WithdrawalOrder

PAYOUT_ACCOUNT = "payout:bank"     # counterpart the captured funds settle to

logger = logging.getLogger("payouts")

# Provider messages that mean the problem is on OAM's side of the gateway
# (empty transfer balance, transfers not enabled, account restrictions) — not
# anything the customer did. They see a calm message; the real reason is logged
# and kept on the order for staff.
_OPERATOR_SIDE = ("balance is not enough", "insufficient balance", "insufficient fund",
                  "not enough", "third party payout", "starter business", "transfers are not",
                  "transfer is not", "not enabled", "disabled", "otp")
OPERATOR_SIDE_MESSAGE = ("Bank transfers are temporarily unavailable. Your money is safe in your "
                         "OAM wallet — please try again later.")


def _customer_reason(raw_reason: str) -> str:
    low = raw_reason.lower()
    if any(k in low for k in _OPERATOR_SIDE):
        return OPERATOR_SIDE_MESSAGE
    return f"Transfer failed: {raw_reason}" if raw_reason else "Transfer failed."


def _operator_side(raw_reason: str) -> bool:
    low = (raw_reason or "").lower()
    return any(k in low for k in _OPERATOR_SIDE)


# What the customer sees while their withdrawal waits in the queue.
QUEUED_MESSAGE = ("Your transfer is being processed. Most transfers arrive within minutes; "
                  "some can take up to 24 hours. Your money is reserved and safe.")
CANCELLED_MESSAGE = "Cancelled — the money is back in your OAM wallet."


def _queue_max_hours() -> int:
    """Refund a queued withdrawal automatically after this long (0 = never)."""
    return int(getattr(settings, "WITHDRAWAL_QUEUE_MAX_HOURS", 72) or 0)


def _provider_balance(provider, currency):
    fn = getattr(provider, "get_balance", None)
    if not fn:
        return None
    try:
        return fn(currency)
    except Exception:                       # never let a balance check block a payout
        logger.warning("could not read %s balance", getattr(provider, "provider_key", "?"))
        return None

# transfer status -> our terminal mapping
_SUCCESS = {"success"}
_FAILED = {"failed", "reversed", "abandoned", "declined"}


def _transfer_fee(amount, currency="NGN"):
    """Wallet -> bank transfer fee (OAM revenue). ₦25 from ₦500+, else ₦10. NGN only."""
    from decimal import Decimal
    if str(currency).upper() != "NGN":
        return Decimal("0")
    return Decimal("25") if Decimal(str(amount)) >= Decimal("500") else Decimal("10")


def _wd_ref() -> str:
    return f"WD-{uuid.uuid4().hex[:20]}"


class WithdrawalError(Exception):
    """User-facing withdrawal problem."""


class WithdrawalService:
    # ---------------- bank accounts ----------------
    @staticmethod
    def list_banks(currency="NGN"):
        provider = ProviderFactory.get("payouts")
        fn = getattr(provider, "list_banks", None)
        return fn(currency) if fn else []

    @staticmethod
    def resolve_account(*, bank_code, account_number, currency="NGN"):
        provider = ProviderFactory.get("payouts")
        try:
            return provider.resolve_account(account_number=account_number,
                                            bank_code=bank_code, currency=currency)
        except ProviderError as exc:
            raise WithdrawalError(str(exc))

    @staticmethod
    def add_bank_account(*, user, bank_code, account_number, currency="NGN"):
        provider = ProviderFactory.get("payouts")
        try:
            resolved = provider.resolve_account(account_number=account_number,
                                                bank_code=bank_code, currency=currency)
            account_name = resolved.get("account_name")
            if not account_name:
                raise WithdrawalError("Could not resolve this account.")
            recipient_code = provider.create_recipient(
                name=account_name, account_number=account_number,
                bank_code=bank_code, currency=currency,
            )
        except ProviderError as exc:
            raise WithdrawalError(str(exc))

        account, _ = BankAccount.objects.update_or_create(
            user=user, bank_code=bank_code, account_number=account_number,
            defaults={"account_name": account_name, "bank_name": resolved.get("bank_name", ""),
                      "recipient_code": recipient_code or "", "currency": currency,
                      "is_active": True},
        )
        return account

    # ---------------- withdrawal lifecycle ----------------
    @staticmethod
    def create_and_hold(*, user, bank_account, amount, currency="NGN", fee=None) -> WithdrawalOrder:
        amount = Decimal(str(amount))
        # fee=None → normal user withdrawal fee; delivery payouts pass fee=0.  # [oam-deliveries]
        fee = _transfer_fee(amount, currency) if fee is None else Decimal(str(fee))
        total = amount + fee
        wallet = WalletService.get_or_create_wallet(user, currency)
        with transaction.atomic():
            order = WithdrawalOrder.objects.create(
                user=user, wallet=wallet, bank_account=bank_account,
                amount=amount, currency=currency.upper(), reference=_wd_ref(),
                status=WithdrawalOrder.Status.PENDING,
                request_payload={"amount": str(amount), "fee": str(fee), "total": str(total),
                                 "bank_account": str(bank_account.id)},
            )
            WalletService.hold(wallet, total, reference=order.reference,
                               description=f"Withdrawal hold {order.reference}",
                               metadata={"withdrawal": str(order.id), "fee": str(fee)})
            order.status = WithdrawalOrder.Status.PROCESSING
            order.save(update_fields=["status", "updated_at"])

        try:
            from apps.notifications.services import notify
            bank = getattr(bank_account, "bank_name", "") or "your bank"
            acct = getattr(bank_account, "account_number", "") or ""
            notify(user, kind="wallet_debit", title="Withdrawal processing",
                   body=f"Your withdrawal of {currency.upper()} {Decimal(str(amount)):,.2f} to {bank} ({acct}) is processing.",
                   data={"amount": str(amount), "currency": currency.upper(), "reference": order.reference},
                   email=True)
        except Exception:
            pass
        return order

    @staticmethod
    def execute(order: WithdrawalOrder) -> WithdrawalOrder:
        provider = ProviderFactory.get("payouts")
        order.provider = provider.provider_key

        # Not enough in the transfer balance? Queue it instead of a doomed attempt.
        available = _provider_balance(provider, order.currency)
        if available is not None and available < order.amount:
            return WithdrawalService._queue(
                order, f"{provider.provider_key} balance {available} < {order.amount}", attempted=False)

        result, error = None, None
        try:
            result = provider.initiate_transfer(
                amount=order.amount, recipient_code=order.bank_account.recipient_code,
                reference=order.transfer_reference or order.reference, currency=order.currency,
                reason=f"OAM withdrawal {order.reference}",
            )
        except ProviderError as exc:
            error = str(exc)

        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (WithdrawalOrder.Status.SUCCESS, WithdrawalOrder.Status.FAILED,
                            WithdrawalOrder.Status.REVERSED, WithdrawalOrder.Status.CANCELLED):
                return o
            o.provider = provider.provider_key
            if result is None:                              # transport error -> keep hold
                o.status = WithdrawalOrder.Status.PROCESSING
                o.failure_reason = (error or "")[:200]
                o.response_payload = {"error": error}
            else:
                status = str(result.get("status", "")).lower()
                o.provider_reference = str(result.get("provider_reference", "") or "")
                o.response_payload = result.get("raw", {})
                if status in _SUCCESS:
                    WithdrawalService._capture(o)
                    o.status = WithdrawalOrder.Status.SUCCESS
                elif status in _FAILED:
                    _raw = result.get("raw", {}) or {}
                    _reason = str(_raw.get("message") or _raw.get("error") or "").strip()
                    if _operator_side(_reason):
                        # Our side of the gateway (empty balance, transfers off):
                        # keep the customer's money held and retry after a top-up.
                        logger.error("withdrawal %s queued (%s): %s", o.reference, o.provider,
                                     _raw.get("error") or _reason)
                        return WithdrawalService._queue(o, _reason, attempted=True, raw=_raw)
                    WithdrawalService._release(o)
                    o.status = WithdrawalOrder.Status.FAILED
                    o.failure_reason = _customer_reason(_reason)[:200]
                    logger.error("withdrawal %s failed at %s: %s", o.reference, o.provider,
                                 _raw.get("error") or _reason or "no reason given")
                else:                                       # pending/otp/queued
                    o.status = WithdrawalOrder.Status.PROCESSING
            o.save(update_fields=["status", "provider", "provider_reference",
                                  "response_payload", "failure_reason", "updated_at"])
        return o

    @staticmethod
    def withdraw(*, user, bank_account, amount, currency="NGN", fee=None) -> WithdrawalOrder:
        order = WithdrawalService.create_and_hold(
            user=user, bank_account=bank_account, amount=amount, currency=currency, fee=fee)
        # First come, first paid: while others are waiting, join the queue and
        # let the queue send in order (it sends this one too if money allows).
        if WithdrawalOrder.objects.filter(status=WithdrawalOrder.Status.QUEUED,
                                          currency=order.currency).exists():
            WithdrawalService._queue(order, "waiting behind earlier queued withdrawals",
                                     attempted=False, alert=False)
            WithdrawalService.process_queue(currency=order.currency)
            order.refresh_from_db()
            return order
        return WithdrawalService.execute(order)

    # ---------------- queue ----------------
    @staticmethod
    def _queue(order, reason, *, attempted, raw=None, alert=True) -> WithdrawalOrder:
        """Park a withdrawal (funds stay held) until the transfer balance allows it."""
        first_time = False
        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (WithdrawalOrder.Status.SUCCESS, WithdrawalOrder.Status.FAILED,
                            WithdrawalOrder.Status.REVERSED, WithdrawalOrder.Status.CANCELLED):
                return o
            first_time = o.queued_at is None
            o.status = WithdrawalOrder.Status.QUEUED
            o.queued_at = o.queued_at or timezone.now()
            if attempted:
                o.attempts += 1
                # The provider saw this reference; the next try must use a new one.
                o.transfer_reference = f"{o.reference}-R{o.attempts}"
            o.failure_reason = ""
            o.response_payload = {**(o.response_payload or {}), "queue_reason": str(reason)[:300],
                                  **({"last_error": raw} if raw else {})}
            o.save(update_fields=["status", "queued_at", "attempts", "transfer_reference",
                                  "failure_reason", "response_payload", "updated_at"])
        if first_time:
            _notify_user(o, "Transfer processing",
                         f"Your transfer of {o.currency} {o.amount:,.2f} is being processed. Most transfers "
                         "arrive within minutes; some can take up to 24 hours. Your money is reserved.",
                         email=False)   # they already got the "withdrawal processing" email
        if alert:
            alert_ops_if_needed(o.currency)
        return o

    @staticmethod
    def process_queue(*, currency=None, limit=100, only_ids=None) -> dict:
        """Send queued withdrawals, oldest first, while the balance allows.

        Safe to run from several places at once (cron, admin, after a
        withdrawal): each order is claimed under a row lock before sending.
        """
        stats = {"sent": 0, "still_queued": 0, "failed": 0, "refunded_overdue": 0}
        qs = WithdrawalOrder.objects.filter(status=WithdrawalOrder.Status.QUEUED)
        if currency:
            qs = qs.filter(currency=currency)
        if only_ids:
            qs = qs.filter(id__in=only_ids)
        ids = list(qs.order_by("queued_at", "created_at").values_list("id", flat=True)[:limit])

        max_h = _queue_max_hours()
        overdue_before = timezone.now() - timedelta(hours=max_h) if max_h else None
        for oid in ids:
            with transaction.atomic():
                o = (WithdrawalOrder.objects.select_for_update(skip_locked=True)
                     .filter(pk=oid, status=WithdrawalOrder.Status.QUEUED).first())
                if o is None:
                    continue                                    # taken or cancelled meanwhile
                if overdue_before and o.queued_at and o.queued_at < overdue_before:
                    WithdrawalService._release(o)
                    o.status = WithdrawalOrder.Status.CANCELLED
                    o.failure_reason = "Refunded to your wallet — the transfer couldn't be completed in time."
                    o.save(update_fields=["status", "failure_reason", "updated_at"])
                    stats["refunded_overdue"] += 1
                    overdue = o
                else:
                    o.status = WithdrawalOrder.Status.PROCESSING   # claim it
                    o.save(update_fields=["status", "updated_at"])
                    overdue = None
            if overdue is not None:
                _notify_user(overdue, "Transfer refunded",
                             f"We couldn't complete your transfer of {overdue.currency} {overdue.amount:,.2f} "
                             "in time, so the money is back in your OAM wallet. Please try again.")
                continue
            result = WithdrawalService.execute(o)
            if result.status == WithdrawalOrder.Status.QUEUED:
                stats["still_queued"] += 1
            elif result.status in (WithdrawalOrder.Status.FAILED, WithdrawalOrder.Status.REVERSED):
                stats["failed"] += 1
            else:
                stats["sent"] += 1
                if result.status == WithdrawalOrder.Status.SUCCESS or result.provider_reference:
                    _notify_user(result, "Transfer sent",
                                 f"Your transfer of {result.currency} {result.amount:,.2f} has been sent to your bank.")
        if stats["still_queued"]:
            alert_ops_if_needed(currency)
        return stats

    @staticmethod
    def cancel(order, *, by_staff=False) -> WithdrawalOrder:
        """Cancel a queued withdrawal and return the money to the wallet."""
        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status != WithdrawalOrder.Status.QUEUED:
                raise WithdrawalError("Only a transfer that is still waiting can be cancelled.")
            WithdrawalService._release(o)
            o.status = WithdrawalOrder.Status.CANCELLED
            o.failure_reason = "Cancelled by OAM support." if by_staff else "Cancelled by you."
            o.save(update_fields=["status", "failure_reason", "updated_at"])
        _notify_user(o, "Transfer cancelled",
                     f"Your transfer of {o.currency} {o.amount:,.2f} was cancelled. The money is back in your OAM wallet.")
        return o

    @staticmethod
    def queue_summary(currency="NGN") -> dict:
        """Totals for staff: what's waiting, the provider balance and the shortfall."""
        qs = WithdrawalOrder.objects.filter(status=WithdrawalOrder.Status.QUEUED, currency=currency)
        total = qs.aggregate(s=Sum("amount"))["s"] or Decimal("0")
        oldest = qs.order_by("queued_at").values_list("queued_at", flat=True).first()
        balance = None
        try:
            balance = _provider_balance(ProviderFactory.get("payouts"), currency)
        except Exception:
            pass
        shortfall = max(Decimal("0"), total - balance) if balance is not None else None
        return {"currency": currency, "count": qs.count(), "total": total, "oldest": oldest,
                "balance": balance, "shortfall": shortfall}

    # ---------------- resolve pending (webhook) ----------------
    @staticmethod
    def apply_transfer_status(reference, transfer_status, raw=None) -> WithdrawalOrder | None:
        order = (WithdrawalOrder.objects.filter(reference=reference).first()
                 or WithdrawalOrder.objects.filter(transfer_reference=reference).first())
        if order is None:
            return None
        status = str(transfer_status).lower()
        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (WithdrawalOrder.Status.SUCCESS, WithdrawalOrder.Status.FAILED,
                            WithdrawalOrder.Status.REVERSED, WithdrawalOrder.Status.CANCELLED):
                return o
            if status in _SUCCESS:
                WithdrawalService._capture(o)
                o.status = WithdrawalOrder.Status.SUCCESS
            elif status in _FAILED:
                WithdrawalService._release(o)
                o.status = (WithdrawalOrder.Status.REVERSED if status == "reversed"
                            else WithdrawalOrder.Status.FAILED)
                o.failure_reason = f"Transfer {status}."
            else:
                o.status = WithdrawalOrder.Status.PROCESSING
            if raw:
                o.response_payload = {**(o.response_payload or {}), "webhook": raw}
            o.save(update_fields=["status", "response_payload", "failure_reason", "updated_at"])
        return o

    # ---------------- ledger helpers ----------------
    @staticmethod
    def _capture(order):
        fee = Decimal(str((order.request_payload or {}).get("fee", "0")))
        total = order.amount + fee
        WalletService.capture(order.currency, total, reference=order.reference,
                              cost=order.amount, counterpart_code=PAYOUT_ACCOUNT,
                              description=f"Withdrawal capture {order.reference}",
                              metadata={"withdrawal": str(order.id), "fee": str(fee)})

    @staticmethod
    def _release(order):
        fee = Decimal(str((order.request_payload or {}).get("fee", "0")))
        total = order.amount + fee
        WalletService.release(order.wallet, total, reference=order.reference,
                              description=f"Withdrawal refund {order.reference}",
                              metadata={"withdrawal": str(order.id)})


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #
def _notify_user(order, title, body, *, email=True):
    try:
        from apps.notifications.services import notify
        notify(order.user, kind="wallet_debit", title=title, body=body,
               data={"amount": str(order.amount), "currency": order.currency,
                     "reference": order.reference, "status": order.status}, email=email)
    except Exception:
        logger.exception("could not notify user about withdrawal %s", order.reference)


def _ops_recipients() -> list[str]:
    emails = [e.strip() for e in (getattr(settings, "OPS_ALERT_EMAILS", None) or []) if e and e.strip()]
    if not emails:
        from django.contrib.auth import get_user_model
        emails = list(get_user_model().objects.filter(is_superuser=True, is_active=True)
                      .exclude(email="").exclude(email__endswith="@deleted.invalid")
                      .values_list("email", flat=True))
    return emails


def alert_ops_if_needed(currency=None, *, force=False) -> bool:
    """Email staff what's waiting and how much to top up.

    Throttled: at most every 30 minutes, unless the waiting total has grown.
    """
    from django.core.cache import cache
    from django.core.mail import send_mail

    cur = (currency or "NGN").upper()
    summary = WithdrawalService.queue_summary(cur)
    if not summary["count"]:
        return False
    key = f"payouts:queue-alert:{cur}"
    last = cache.get(key) or {}
    grew = Decimal(str(summary["total"])) > Decimal(str(last.get("total", "0")))
    if not force and last and not grew:
        return False

    oldest = summary["oldest"]
    waited = ""
    if oldest:
        hours = (timezone.now() - oldest).total_seconds() / 3600
        waited = f"Oldest has waited {hours:.1f} hours." + ("  ⚠ OVER 24 HOURS." if hours >= 24 else "")
    bal = "unknown" if summary["balance"] is None else f"{cur} {summary['balance']:,.2f}"
    need = (f"Top up your Paystack balance by at least {cur} {summary['shortfall']:,.2f}."
            if summary["shortfall"] else "Your balance may now cover them — they'll be retried automatically.")
    body = (f"{summary['count']} withdrawal(s) are waiting, {cur} {summary['total']:,.2f} in total.\n"
            f"Paystack balance: {bal}.\n{need}\n{waited}\n\n"
            "Customers' money is reserved in their wallets. Queued withdrawals are sent automatically, "
            "oldest first, as soon as the balance allows (or use Admin > Withdrawal orders > Retry now).")
    recipients = _ops_recipients()
    if not recipients:
        logger.error("withdrawal queue alert: no OPS_ALERT_EMAILS / superuser emails set. %s", body)
        return False
    try:
        send_mail(f"[OAM] {summary['count']} withdrawal(s) waiting — {cur} {summary['total']:,.2f}",
                  body, None, recipients, fail_silently=False)
    except Exception:
        logger.exception("withdrawal queue alert email failed")
        return False
    # Only start the 30-minute quiet period once staff have actually been told.
    cache.set(key, {"total": str(summary["total"])}, 30 * 60)
    return True
