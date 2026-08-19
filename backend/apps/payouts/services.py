"""
WithdrawalService — money OUT to a bank via the transfers provider.

Same safety pattern as bills:
  1) create order + HOLD funds   (atomic; balance drops, overdraft-blocked)
  2) initiate the transfer        (external; outside the DB transaction)
  3) SUCCESS -> CAPTURE (funds leave to the bank)
     FAILED  -> RELEASE (refund the wallet)
     PENDING -> keep the hold; webhook resolves it
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.db import transaction

from integrations.base import ProviderFactory
from integrations.base.exceptions import ProviderError
from apps.wallet.services import WalletService

from .models import BankAccount, WithdrawalOrder

PAYOUT_ACCOUNT = "payout:bank"     # counterpart the captured funds settle to

# transfer status -> our terminal mapping
_SUCCESS = {"success"}
_FAILED = {"failed", "reversed", "abandoned", "declined"}


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
    def create_and_hold(*, user, bank_account, amount, currency="NGN") -> WithdrawalOrder:
        amount = Decimal(str(amount))
        wallet = WalletService.get_or_create_wallet(user, currency)
        with transaction.atomic():
            order = WithdrawalOrder.objects.create(
                user=user, wallet=wallet, bank_account=bank_account,
                amount=amount, currency=currency.upper(), reference=_wd_ref(),
                status=WithdrawalOrder.Status.PENDING,
                request_payload={"amount": str(amount), "bank_account": str(bank_account.id)},
            )
            WalletService.hold(wallet, amount, reference=order.reference,
                               description=f"Withdrawal hold {order.reference}",
                               metadata={"withdrawal": str(order.id)})
            order.status = WithdrawalOrder.Status.PROCESSING
            order.save(update_fields=["status", "updated_at"])
        return order

    @staticmethod
    def execute(order: WithdrawalOrder) -> WithdrawalOrder:
        provider = ProviderFactory.get("payouts")
        order.provider = provider.provider_key
        result, error = None, None
        try:
            result = provider.initiate_transfer(
                amount=order.amount, recipient_code=order.bank_account.recipient_code,
                reference=order.reference, currency=order.currency,
                reason=f"OAM withdrawal {order.reference}",
            )
        except ProviderError as exc:
            error = str(exc)

        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (WithdrawalOrder.Status.SUCCESS, WithdrawalOrder.Status.FAILED,
                            WithdrawalOrder.Status.REVERSED):
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
                    WithdrawalService._release(o)
                    o.status = WithdrawalOrder.Status.FAILED
                    _raw = result.get("raw", {}) or {}
                    _reason = str(_raw.get("error") or _raw.get("message") or "").strip()
                    o.failure_reason = (f"Transfer failed: {_reason}" if _reason else "Transfer failed.")[:200]
                else:                                       # pending/otp/queued
                    o.status = WithdrawalOrder.Status.PROCESSING
            o.save(update_fields=["status", "provider", "provider_reference",
                                  "response_payload", "failure_reason", "updated_at"])
        return o

    @staticmethod
    def withdraw(*, user, bank_account, amount, currency="NGN") -> WithdrawalOrder:
        order = WithdrawalService.create_and_hold(
            user=user, bank_account=bank_account, amount=amount, currency=currency)
        return WithdrawalService.execute(order)

    # ---------------- resolve pending (webhook) ----------------
    @staticmethod
    def apply_transfer_status(reference, transfer_status, raw=None) -> WithdrawalOrder | None:
        order = WithdrawalOrder.objects.filter(reference=reference).first()
        if order is None:
            return None
        status = str(transfer_status).lower()
        with transaction.atomic():
            o = WithdrawalOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (WithdrawalOrder.Status.SUCCESS, WithdrawalOrder.Status.FAILED,
                            WithdrawalOrder.Status.REVERSED):
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
        WalletService.capture(order.currency, order.amount, reference=order.reference,
                              counterpart_code=PAYOUT_ACCOUNT,
                              description=f"Withdrawal capture {order.reference}",
                              metadata={"withdrawal": str(order.id)})

    @staticmethod
    def _release(order):
        WalletService.release(order.wallet, order.amount, reference=order.reference,
                              description=f"Withdrawal refund {order.reference}",
                              metadata={"withdrawal": str(order.id)})
