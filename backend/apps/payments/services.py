"""
Funding orchestration.

initialize(): create a PENDING ServiceTransaction and ask the gateway to start
a charge (returns an authorization URL the user pays at).

settle(): idempotently move the transaction to SUCCESS/FAILED. On success it
credits the wallet through WalletService with an idempotency key, so a duplicate
webhook + a client-side verify can BOTH call settle and the wallet is credited
exactly once.
"""
from __future__ import annotations

import json
import uuid
from decimal import Decimal, ROUND_CEILING

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from integrations.base import ProviderFactory
from integrations.base.dto import TxnStatus
from apps.wallet.services import WalletService

from .models import ServiceTransaction, WebhookEvent
import logging
logger = logging.getLogger("payments")


def _funding_ref() -> str:
    return f"FUND-{uuid.uuid4().hex[:20]}"


# Paystack NGN pricing: 1.5% + ₦100, the ₦100 flat waived below ₦2,500, fee capped at ₦2,000.
# Gross-up so that AFTER Paystack's fee the reserve nets the customer's intended deposit —
# i.e. the customer bears the fee at checkout and receives 100% of their deposit in-wallet.
_PS_PCT = Decimal("0.015")
_PS_FLAT = Decimal("100")
_PS_CAP = Decimal("2000")
_PS_FLAT_THRESHOLD = Decimal("2500")


def paystack_gross_up(net: Decimal) -> Decimal:
    """Amount to charge so the settled value equals `net` after Paystack's fee."""
    net = Decimal(str(net))
    if net <= 0:
        return net
    gross_with_flat = (net + _PS_FLAT) / (Decimal("1") - _PS_PCT)
    if gross_with_flat >= _PS_FLAT_THRESHOLD:
        gross = gross_with_flat
    else:
        gross = net / (Decimal("1") - _PS_PCT)   # flat waived for small charges
    if (gross - net) > _PS_CAP:                    # fee is capped
        gross = net + _PS_CAP
    return gross.quantize(Decimal("0.01"), rounding=ROUND_CEILING)


class FundingService:
    @staticmethod
    @transaction.atomic
    def initialize(user, amount: Decimal, currency: str, *, provider_key=None, callback_url=None,
                   subaccount=None, transaction_charge=None, bearer=None,
                   settle_amount: Decimal | None = None,
                   settle_currency: str | None = None):
        """
        Create a PENDING funding transaction and open a gateway charge.

        `currency`/`amount` are what the CARD is charged. By default the wallet
        is credited the same; pass `settle_amount`/`settle_currency` to
        decouple — the airtime flow charges USD/GBP/EUR but credits NGN.

        The Paystack deposit-subaccount gross-up is only applied to an NGN
        charge on Paystack; it models Paystack's fee schedule and would
        overcharge a foreign-currency or Flutterwave charge.
        """
        charge_ccy = currency.upper()
        settle_ccy = (settle_currency or charge_ccy).upper()
        settle_amt = Decimal(str(settle_amount)) if settle_amount is not None else amount

        wallet = WalletService.get_or_create_wallet(user, settle_ccy)
        gateway = ProviderFactory.get("payments", provider_key)
        reference = _funding_ref()

        meta = {
            "user_id": str(user.id),
            "charge_currency": charge_ccy,
            "charge_amount": str(amount),
            "settle_currency": settle_ccy,
            "settle_amount": str(settle_amt),
        }

        txn = ServiceTransaction.objects.create(
            user=user, service_type=ServiceTransaction.Service.WALLET_FUND,
            provider=gateway.provider_key, status=ServiceTransaction.Status.PENDING,
            amount=amount, currency=charge_ccy,
            internal_reference=reference, idempotency_key=reference, wallet=wallet,
            request_payload={"amount": str(amount), "currency": charge_ccy},
            metadata=meta,
        )

        # The customer pays EXACTLY the amount they entered — no Paystack-fee gross-up.
        # The deposit still settles to the reserve subaccount, but OAM's main account
        # bears the Paystack fee (bearer defaults to "account"), so nothing extra is
        # added to what the customer is charged.
        charge_amount = amount
        if charge_ccy == "NGN" and gateway.provider_key == "paystack":
            if subaccount is None:
                dep = getattr(settings, "PAYSTACK_DEPOSIT_SUBACCOUNT_CODE", "") or ""
                if dep:
                    subaccount = dep
                    if transaction_charge is None:
                        transaction_charge = 0

        init = gateway.initialize_charge(
            amount=charge_amount, currency=charge_ccy,
            email=user.email or f"{user.id}@no-email.oam",
            reference=reference, metadata=meta,
            callback_url=callback_url,
            subaccount=subaccount, transaction_charge=transaction_charge, bearer=bearer,
        )
        txn.provider_reference = init.provider_reference
        txn.response_payload = init.raw
        txn.status = ServiceTransaction.Status.PROCESSING
        txn.save(update_fields=["provider_reference", "response_payload", "status", "updated_at"])
        return txn, init

    @staticmethod
    @transaction.atomic
    def settle(reference: str, *, verified_status: str | None = None, raw: dict | None = None):
        """
        Idempotently settle a funding transaction.

        Before crediting, cross-checks the gateway's reported amount and
        currency against the initiated record. A mismatch (tampered webhook,
        unexpected FX move, or a payload from a different transaction) is
        logged and the transaction is left in PROCESSING for investigation.
        """
        txn = (ServiceTransaction.objects
               .select_for_update()
               .filter(internal_reference=reference).first())
        if txn is None:
            return None
        if txn.status == ServiceTransaction.Status.SUCCESS:
            return txn

        status_val = verified_status
        if status_val is None:
            gateway = ProviderFactory.get("payments", txn.provider)
            result = gateway.verify_charge(txn.provider_reference or reference)
            status_val, raw = result.status, result.raw

        # Cross-check amount + currency when the gateway reported success.
        if status_val == TxnStatus.SUCCESS and isinstance(raw, dict):
            d = raw.get("data", raw) or {}
            reported_ccy = str(d.get("currency", "")).upper()
            try:
                reported_amt = Decimal(str(d.get("amount", "0")))
            except Exception:
                reported_amt = Decimal("0")
            if reported_ccy and reported_ccy != txn.currency.upper():
                logger.error("settle %s: currency mismatch gateway=%s txn=%s",
                             reference, reported_ccy, txn.currency)
                return txn
            if reported_amt and reported_amt != txn.amount:
                logger.error("settle %s: amount mismatch gateway=%s txn=%s",
                             reference, reported_amt, txn.amount)
                return txn

        if status_val == TxnStatus.SUCCESS:
            meta = txn.metadata or {}
            credit_amount = Decimal(str(meta.get("settle_amount") or txn.amount))
            credit_currency = (meta.get("settle_currency") or txn.currency).upper()

            if txn.wallet is None or txn.wallet.currency != credit_currency:
                txn.wallet = WalletService.get_or_create_wallet(txn.user, credit_currency)

            journal = WalletService.credit(
                txn.wallet, credit_amount,
                source_code=f"gateway:{txn.provider}",
                description=f"Wallet funding {reference}",
                reference=reference, idempotency_key=f"fund:{reference}",
                metadata={
                    "txn": str(txn.id), "provider": txn.provider,
                    "charge_currency": txn.currency, "charge_amount": str(txn.amount),
                    "settle_currency": credit_currency, "settle_amount": str(credit_amount),
                },
            )
            txn.journal = journal
            txn.status = ServiceTransaction.Status.SUCCESS
        elif status_val == TxnStatus.FAILED:
            txn.status = ServiceTransaction.Status.FAILED

        if raw:
            txn.response_payload = {**(txn.response_payload or {}), "settle": raw}
        txn.save(update_fields=["journal", "status", "response_payload", "updated_at"])

        if txn.status == ServiceTransaction.Status.SUCCESS:
            def _book_bus(ref=reference):
                try:
                    from apps.travu.booking import BusBookingService
                    BusBookingService.on_funding_settled(ref)
                except Exception:
                    pass
            transaction.on_commit(_book_bus)

            def _send_airtime(ref=reference):
                try:
                    from apps.reloadly.topup import AirtimeTopupService
                    AirtimeTopupService.on_funding_settled(ref)
                except Exception:
                    pass
            transaction.on_commit(_send_airtime)

        return txn


class WebhookService:
    @staticmethod
    def ingest(provider: str, raw_body: bytes, headers: dict):
        """Verify signature, persist once, return (event, should_process)."""
        gateway = ProviderFactory.get("payments", provider)
        valid = gateway.verify_webhook(raw_body, headers)
        try:
            payload = json.loads(raw_body or b"{}")
        except ValueError:
            payload = {}

        event_type = payload.get("event", "")
        data = payload.get("data", {}) or {}

        # Paystack uses `data.reference`; Flutterwave uses `data.tx_ref`.
        # We always initialise Flutterwave with our own tx_ref (== internal
        # reference), so either shape resolves to the same value.
        reference = data.get("reference") or data.get("tx_ref") or ""
        external_id = f"{event_type}:{reference}" or str(uuid.uuid4())

        event, created = WebhookEvent.objects.get_or_create(
            provider=provider, external_id=external_id,
            defaults={"event_type": event_type, "signature_valid": valid,
                      "raw_payload": payload, "headers": headers},
        )
        if not valid:
            if created:
                event.status = WebhookEvent.Status.FAILED
                event.save(update_fields=["status"])
            return event, False

        # Paystack signals a success with event="charge.success".
        # Flutterwave signals it with event="charge.completed" +
        # data.status == "successful".
        is_success = (
            event_type == "charge.success"
            or (event_type == "charge.completed"
                and str(data.get("status", "")).lower() == "successful")
        )
        should = created and is_success
        return event, should

    @staticmethod
    def mark_processed(event: WebhookEvent):
        event.status = WebhookEvent.Status.PROCESSED
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "processed_at"])
