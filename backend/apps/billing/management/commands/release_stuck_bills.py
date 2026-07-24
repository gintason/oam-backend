"""
Release funds held by bill orders that got stuck (hold succeeded but the order
never reached the provider). Safe: only touches orders still in processing/
pending with no provider_reference, and releases each hold back to the wallet.

Run: python manage.py release_stuck_bills
"""
from django.core.management.base import BaseCommand

from apps.billing.models import BillOrder
from apps.billing.services import BillingService


class Command(BaseCommand):
    help = "Release holds for stuck bill orders (no provider reference)."

    def handle(self, *args, **opts):
        stuck = BillOrder.objects.filter(
            status__in=[BillOrder.Status.PROCESSING, BillOrder.Status.PENDING],
            provider_reference__isnull=True,
        )
        if not stuck.exists():
            self.stdout.write(self.style.WARNING("No stuck orders found."))
            return
        for order in stuck:
            try:
                BillingService._release(order)
                order.status = BillOrder.Status.REVERSED
                order.save(update_fields=["status", "updated_at"])
                self.stdout.write(self.style.SUCCESS(
                    f"Released {order.amount} {order.currency} for {order.reference}"
                ))
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(
                    f"Could not release {order.reference}: {exc}"
                ))
