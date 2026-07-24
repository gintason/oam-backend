"""Celery tasks for payment processing (webhook settlement)."""
from celery import shared_task


@shared_task(name="tasks.payments.settle_funding", bind=True,
             autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def settle_funding(self, reference, verified_status=None, raw=None):
    from apps.payments.services import FundingService
    FundingService.settle(reference, verified_status=verified_status, raw=raw)
