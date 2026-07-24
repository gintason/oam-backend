"""
Placeholder task proving the Celery wiring end-to-end.

Real task modules (tasks/payments.py, tasks/remittance.py, tasks/travel.py,
tasks/reconciliation.py, tasks/notifications.py) arrive with their phases.
"""
from celery import shared_task


@shared_task(name="tasks.example.ping")
def ping():
    return "pong"
