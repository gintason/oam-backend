"""
Celery tasks for jobs. Scheduled in settings.CELERY_BEAT_SCHEDULE.

No worker? The same work runs from cron with
    python manage.py jobs_maintenance
and `services.dispatch()` runs the event-driven ones inline.
"""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="jobs.expire_listings", ignore_result=True)
def expire_listings():
    from .services import MaintenanceService
    n = MaintenanceService.expire_listings()
    m = MaintenanceService.expire_promotions()
    logger.info("jobs: expired %s listings, %s promotions", n, m)
    return n


@shared_task(name="jobs.send_due_alert_digests", ignore_result=True)
def send_due_alert_digests():
    from .services import AlertService
    stats = AlertService.send_due_digests()
    logger.info("jobs: alert digests %s", stats)
    return stats


@shared_task(name="jobs.send_instant_alerts_for_job", ignore_result=True,
             autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_instant_alerts_for_job(job_id):
    from .models import JobListing
    from .services import AlertService
    job = JobListing.objects.select_related("employer").filter(pk=job_id).first()
    return AlertService.send_instant_for_job(job) if job else 0


@shared_task(name="jobs.flag_suspicious_listings", ignore_result=True)
def flag_suspicious_listings(hours=24):
    from .services import MaintenanceService
    return MaintenanceService.rescan_recent(hours=hours)


@shared_task(name="jobs.subscription_reminders", ignore_result=True)
def subscription_reminders():
    from .services import MaintenanceService
    return MaintenanceService.subscription_reminders()


@shared_task(name="jobs.rebuild_matching_index", ignore_result=True)
def rebuild_matching_index():
    from .matching import build_idf
    return len(build_idf(force=True))
