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
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from integrations.base import ProviderFactory
from integrations.base.dto import TxnStatus
from apps.wallet.services import WalletService

from .models import ServiceTransaction, WebhookEvent


def _funding_ref() -> str:
    return f"FUND-{uuid.uuid4().hex[:20]}"


class FundingService:
    @staticmethod
    @transaction.atomic
    def initialize(user, amount: Decimal, currency: str, *, provider_key=None, callback_url=None):
        currency = currency.upper()
        wallet = WalletService.get_or_create_wallet(user, currency)
        gateway = ProviderFactory.get("payments", provider_key)
        reference = _funding_ref()

        txn = ServiceTransaction.objects.create(
            user=user, service_type=ServiceTransaction.Service.WALLET_FUND,
            provider=gateway.provider_key, status=ServiceTransaction.Status.PENDING,
            amount=amount, currency=currency,
            internal_reference=reference, idempotency_key=reference, wallet=wallet,
            request_payload={"amount": str(amount), "currency": currency},
        )
        init = gateway.initialize_charge(
            amount=amount, currency=currency,
            email=user.email or f"{user.id}@no-email.oam",
            reference=reference, metadata={"user_id": str(user.id), "txn": str(txn.id)},
            callback_url=callback_url,
        )
        txn.provider_reference = init.provider_reference
        txn.response_payload = init.raw
        txn.status = ServiceTransaction.Status.PROCESSING
        txn.save(update_fields=["provider_reference", "response_payload", "status", "updated_at"])
        return txn, init

    @staticmethod
    @transaction.atomic
    def settle(reference: str, *, verified_status: str | None = None, raw: dict | None = None):
        txn = (ServiceTransaction.objects
               .select_for_update()
               .filter(internal_reference=reference).first())
        if txn is None:
            return None
        if txn.status == ServiceTransaction.Status.SUCCESS:
            return txn  # already settled — idempotent

        status_val = verified_status
        if status_val is None:
            gateway = ProviderFactory.get("payments", txn.provider)
            result = gateway.verify_charge(txn.provider_reference or reference)
            status_val, raw = result.status, result.raw

        if status_val == TxnStatus.SUCCESS:
            journal = WalletService.credit(
                txn.wallet, txn.amount,
                source_code=f"gateway:{txn.provider}",
                description=f"Wallet funding {reference}",
                reference=reference, idempotency_key=f"fund:{reference}",
                metadata={"txn": str(txn.id), "provider": txn.provider},
            )
            txn.journal = journal
            txn.status = ServiceTransaction.Status.SUCCESS
        elif status_val == TxnStatus.FAILED:
            txn.status = ServiceTransaction.Status.FAILED

        if raw:
            txn.response_payload = {**(txn.response_payload or {}), "settle": raw}
        txn.save(update_fields=["journal", "status", "response_payload", "updated_at"])
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
        reference = data.get("reference", "")
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
        # Only process a freshly-seen, valid, success event.
        should = created and event_type == "charge.success"
        return event, should

    @staticmethod
    def mark_processed(event: WebhookEvent):
        event.status = WebhookEvent.Status.PROCESSED
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "processed_at"])
