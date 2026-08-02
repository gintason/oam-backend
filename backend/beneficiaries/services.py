"""
The one function the rest of the codebase should call to record a beneficiary.

Kept separate from views so it can be invoked from wherever a purchase actually
succeeds — the billing purchase view, a webhook that confirms a card payment,
or a Celery task — without importing view/serializer machinery.
"""
import logging

from django.utils import timezone

from .models import Beneficiary

log = logging.getLogger(__name__)


def upsert_beneficiary(
    *,
    user,
    service_type,
    account_identifier,
    biller_code="",
    biller_name="",
    customer_name="",
):
    """
    Create or refresh a saved beneficiary.

    Idempotent: calling it again for an identifier the user already has simply
    bumps `last_used_at` (so it floats to the top of "Recent") and fills in any
    newly available detail. Safe to call on every successful purchase.

    Never raises. Saving a convenience record must not be able to fail a real
    transaction, so any error is swallowed and logged.
    """
    account_identifier = (account_identifier or "").strip()
    if not user or not getattr(user, "is_authenticated", False) or not account_identifier:
        return None
    if service_type not in Beneficiary.Service.values:
        return None

    try:
        obj, created = Beneficiary.objects.get_or_create(
            user=user,
            service_type=service_type,
            account_identifier=account_identifier,
            defaults={
                "biller_code": biller_code or "",
                "biller_name": biller_name or "",
                "customer_name": customer_name or "",
            },
        )
        if not created:
            obj.last_used_at = timezone.now()
            # Only overwrite with non-empty values — a later purchase should
            # never blank out a name we resolved earlier.
            if biller_code:
                obj.biller_code = biller_code
            if biller_name:
                obj.biller_name = biller_name
            if customer_name:
                obj.customer_name = customer_name
            obj.save(
                update_fields=[
                    "last_used_at",
                    "biller_code",
                    "biller_name",
                    "customer_name",
                ]
            )
        return obj
    except Exception:  # pragma: no cover - defensive
        log.exception("Failed to upsert beneficiary for user=%s", getattr(user, "pk", None))
        return None
