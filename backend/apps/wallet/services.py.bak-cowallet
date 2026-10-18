"""
WalletService — the ONLY way money moves.

Credit/debit are the simple primitives. For spending against an external
provider that might fail, use the three-step pattern:

    hold()    wallet   -> suspense   (reserve funds; balance drops, overdraft-blocked)
    capture() suspense -> provider   (finalise the spend; balance unchanged)
    release() suspense -> wallet      (refund; balance restored)

So a bill purchase HOLDs first, calls the provider, then CAPTUREs on success or
RELEASEs on failure — the user is never left silently debited.
"""
from __future__ import annotations

import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum

from .exceptions import (
    InsufficientFunds,
    UnbalancedJournal,
    UnsupportedCurrency,
)
from .models import JournalEntry, LedgerAccount, LedgerPosting, Wallet

CENTS = Decimal("0.0001")
HOLD_ACCOUNT = "suspense:hold"
REVENUE_ACCOUNT = "oam:revenue"      # accumulates OAM profit (per currency)


def _money(value) -> Decimal:
    amount = Decimal(str(value)).quantize(CENTS, rounding=ROUND_HALF_UP)
    if amount <= 0:
        raise UnbalancedJournal("Amount must be positive.")
    return amount


def _new_reference() -> str:
    return f"JRNL-{uuid.uuid4().hex[:18]}"


def _check_currency(currency: str) -> str:
    currency = currency.upper()
    if currency not in settings.SUPPORTED_CURRENCIES:
        raise UnsupportedCurrency(f"{currency} is not supported.")
    return currency


class WalletService:
    # -------------------- accounts & wallets --------------------
    @staticmethod
    def get_or_create_wallet(user, currency: str) -> Wallet:
        currency = _check_currency(currency)
        wallet = (Wallet.objects.select_related("account")
                  .filter(user=user, currency=currency).first())
        if wallet:
            return wallet
        with transaction.atomic():
            account = LedgerAccount.objects.create(
                code=f"wallet:{user.id}:{currency}",
                name=f"Wallet {getattr(user, 'identifier', user.pk)} {currency}",
                type=LedgerAccount.Type.LIABILITY,
                currency=currency, owner=user, is_system=False,
            )
            wallet = Wallet.objects.create(user=user, currency=currency, account=account)
        return wallet

    @staticmethod
    def system_account(code: str, currency: str, acc_type: str) -> LedgerAccount:
        currency = _check_currency(currency)
        account, _ = LedgerAccount.objects.get_or_create(
            code=f"{code}:{currency}",
            defaults={"name": code, "type": acc_type, "currency": currency, "is_system": True},
        )
        return account

    # -------------------- core posting --------------------
    @staticmethod
    @transaction.atomic
    def post(*, currency, description, lines, reference=None, idempotency_key=None, metadata=None):
        currency = _check_currency(currency)
        if idempotency_key:
            existing = JournalEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        debit = sum((a for (_, d, a) in lines if d == LedgerPosting.Direction.DEBIT), Decimal("0"))
        credit = sum((a for (_, d, a) in lines if d == LedgerPosting.Direction.CREDIT), Decimal("0"))
        if debit != credit or debit <= 0:
            raise UnbalancedJournal(f"Debits ({debit}) must equal credits ({credit}).")

        journal = JournalEntry.objects.create(
            reference=reference or _new_reference(),
            idempotency_key=idempotency_key,
            currency=currency, description=description, metadata=metadata or {},
        )
        for account, direction, amount in lines:
            LedgerPosting.objects.create(
                journal=journal, account=account, direction=direction,
                amount=amount, currency=currency,
            )
        return journal

    # -------------------- simple credit/debit --------------------
    @staticmethod
    @transaction.atomic
    def credit(wallet, amount, *, source_code="cash:clearing", description="Wallet credit",
               reference=None, idempotency_key=None, metadata=None) -> JournalEntry:
        amount = _money(amount)
        if idempotency_key:
            existing = JournalEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing
        locked = Wallet.objects.select_for_update().select_related("account").get(pk=wallet.pk)
        source = WalletService.system_account(source_code, locked.currency, LedgerAccount.Type.ASSET)
        journal = WalletService.post(
            currency=locked.currency, description=description,
            lines=[(source, LedgerPosting.Direction.DEBIT, amount),
                   (locked.account, LedgerPosting.Direction.CREDIT, amount)],
            reference=reference, idempotency_key=idempotency_key, metadata=metadata,
        )
        locked.cached_balance += amount
        locked.version += 1
        locked.save(update_fields=["cached_balance", "version", "updated_at"])
        return journal

    @staticmethod
    @transaction.atomic
    def debit(wallet, amount, *, dest_code="suspense", description="Wallet debit",
              allow_overdraft=False, reference=None, idempotency_key=None, metadata=None) -> JournalEntry:
        amount = _money(amount)
        if idempotency_key:
            existing = JournalEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing
        locked = Wallet.objects.select_for_update().select_related("account").get(pk=wallet.pk)
        if not allow_overdraft and (locked.cached_balance - amount) < 0:
            raise InsufficientFunds(
                f"Balance {locked.cached_balance} {locked.currency} is insufficient for {amount}."
            )
        dest = WalletService.system_account(dest_code, locked.currency, LedgerAccount.Type.SUSPENSE)
        journal = WalletService.post(
            currency=locked.currency, description=description,
            lines=[(locked.account, LedgerPosting.Direction.DEBIT, amount),
                   (dest, LedgerPosting.Direction.CREDIT, amount)],
            reference=reference, idempotency_key=idempotency_key, metadata=metadata,
        )
        locked.cached_balance -= amount
        locked.version += 1
        locked.save(update_fields=["cached_balance", "version", "updated_at"])
        return journal

    # -------------------- hold / capture / release --------------------
    @staticmethod
    @transaction.atomic
    def hold(wallet, amount, *, reference, idempotency_key=None,
             description="Funds hold", metadata=None) -> JournalEntry:
        """Reserve funds: wallet -> suspense. Balance drops; overdraft blocked."""
        amount = _money(amount)
        key = idempotency_key or f"hold:{reference}"
        existing = JournalEntry.objects.filter(idempotency_key=key).first()
        if existing:
            return existing
        locked = Wallet.objects.select_for_update().select_related("account").get(pk=wallet.pk)
        if (locked.cached_balance - amount) < 0:
            raise InsufficientFunds(
                f"Balance {locked.cached_balance} {locked.currency} is insufficient for {amount}."
            )
        suspense = WalletService.system_account(HOLD_ACCOUNT, locked.currency, LedgerAccount.Type.SUSPENSE)
        journal = WalletService.post(
            currency=locked.currency, description=description,
            lines=[(locked.account, LedgerPosting.Direction.DEBIT, amount),
                   (suspense, LedgerPosting.Direction.CREDIT, amount)],
            reference=f"{reference}:hold", idempotency_key=key, metadata=metadata,
        )
        locked.cached_balance -= amount
        locked.version += 1
        locked.save(update_fields=["cached_balance", "version", "updated_at"])
        return journal

    @staticmethod
    @transaction.atomic
    def capture(currency, amount, *, reference, cost=None,
                counterpart_code="provider:settlement", revenue_code=REVENUE_ACCOUNT,
                idempotency_key=None, description="Capture", metadata=None) -> JournalEntry:
        """
        Finalise a spend: suspense -> provider (+ OAM revenue).

        `amount` is the face value the user paid (held). `cost` is what the
        provider actually charged us (e.g. VTU's amount_charged). The difference
        is OAM's margin, credited to the revenue account. Wallet balance is
        unchanged (the money already left the wallet at hold time).

            DR suspense:hold   amount
            CR provider        cost           (our real cost / float consumed)
            CR oam:revenue     amount - cost  (OAM profit)  <- only if > 0
        """
        currency = _check_currency(currency)
        amount = _money(amount)
        key = idempotency_key or f"capture:{reference}"
        existing = JournalEntry.objects.filter(idempotency_key=key).first()
        if existing:
            return existing

        # Sanitise cost: must be > 0 and <= amount, else treat as no-margin.
        margin = Decimal("0")
        if cost is not None:
            cost = Decimal(str(cost)).quantize(CENTS, rounding=ROUND_HALF_UP)
            if cost <= 0 or cost > amount:
                cost = amount
            margin = amount - cost
        else:
            cost = amount

        suspense = WalletService.system_account(HOLD_ACCOUNT, currency, LedgerAccount.Type.SUSPENSE)
        provider = WalletService.system_account(counterpart_code, currency, LedgerAccount.Type.LIABILITY)
        lines = [(suspense, LedgerPosting.Direction.DEBIT, amount),
                 (provider, LedgerPosting.Direction.CREDIT, cost)]
        if margin > 0:
            revenue = WalletService.system_account(revenue_code, currency, LedgerAccount.Type.LIABILITY)
            lines.append((revenue, LedgerPosting.Direction.CREDIT, margin))

        return WalletService.post(
            currency=currency, description=description, lines=lines,
            reference=f"{reference}:capture", idempotency_key=key,
            metadata={**(metadata or {}), "cost": str(cost), "margin": str(margin)},
        )

    # -------------------- OAM revenue (admin) --------------------
    @staticmethod
    def account_balance(code_or_account, currency=None) -> Decimal:
        """Balance of any ledger account (credits - debits)."""
        if isinstance(code_or_account, LedgerAccount):
            account = code_or_account
        else:
            account = LedgerAccount.objects.filter(code=f"{code_or_account}:{currency}").first()
            if account is None:
                return Decimal("0")
        agg = LedgerPosting.objects.filter(account=account).aggregate(
            credit=Sum("amount", filter=Q(direction=LedgerPosting.Direction.CREDIT)),
            debit=Sum("amount", filter=Q(direction=LedgerPosting.Direction.DEBIT)),
        )
        return (agg["credit"] or Decimal("0")) - (agg["debit"] or Decimal("0"))

    @staticmethod
    def revenue_balance(currency) -> Decimal:
        return WalletService.account_balance(REVENUE_ACCOUNT, currency)

    @staticmethod
    @transaction.atomic
    def sweep_revenue(wallet, amount, *, reference=None, description="Revenue sweep") -> JournalEntry:
        """Move accumulated OAM revenue into an (admin) wallet, making it withdrawable."""
        amount = _money(amount)
        available = WalletService.revenue_balance(wallet.currency)
        if amount > available:
            raise InsufficientFunds(
                f"Revenue available is {available} {wallet.currency}, cannot sweep {amount}."
            )
        ref = reference or _new_reference()
        revenue = WalletService.system_account(REVENUE_ACCOUNT, wallet.currency,
                                               LedgerAccount.Type.LIABILITY)
        locked = Wallet.objects.select_for_update().select_related("account").get(pk=wallet.pk)
        journal = WalletService.post(
            currency=locked.currency, description=description,
            lines=[(revenue, LedgerPosting.Direction.DEBIT, amount),
                   (locked.account, LedgerPosting.Direction.CREDIT, amount)],
            reference=f"{ref}:sweep", idempotency_key=f"sweep:{ref}",
        )
        locked.cached_balance += amount
        locked.version += 1
        locked.save(update_fields=["cached_balance", "version", "updated_at"])
        return journal

    @staticmethod
    @transaction.atomic
    def release(wallet, amount, *, reference, idempotency_key=None,
                description="Funds release", metadata=None) -> JournalEntry:
        """Refund a hold: suspense -> wallet. Balance restored."""
        amount = _money(amount)
        key = idempotency_key or f"release:{reference}"
        existing = JournalEntry.objects.filter(idempotency_key=key).first()
        if existing:
            return existing
        locked = Wallet.objects.select_for_update().select_related("account").get(pk=wallet.pk)
        suspense = WalletService.system_account(HOLD_ACCOUNT, locked.currency, LedgerAccount.Type.SUSPENSE)
        journal = WalletService.post(
            currency=locked.currency, description=description,
            lines=[(suspense, LedgerPosting.Direction.DEBIT, amount),
                   (locked.account, LedgerPosting.Direction.CREDIT, amount)],
            reference=f"{reference}:release", idempotency_key=key, metadata=metadata,
        )
        locked.cached_balance += amount
        locked.version += 1
        locked.save(update_fields=["cached_balance", "version", "updated_at"])
        return journal

    # -------------------- balances --------------------
    @staticmethod
    def derived_balance(wallet) -> Decimal:
        agg = LedgerPosting.objects.filter(account=wallet.account).aggregate(
            credit=Sum("amount", filter=Q(direction=LedgerPosting.Direction.CREDIT)),
            debit=Sum("amount", filter=Q(direction=LedgerPosting.Direction.DEBIT)),
        )
        return (agg["credit"] or Decimal("0")) - (agg["debit"] or Decimal("0"))
