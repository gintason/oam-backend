import json

from django.core.management.base import BaseCommand

from apps.deliveries.services import MaintenanceService


class Command(BaseCommand):
    help = "Expire dispatch offers, run next rounds, refund lapsed requests, reconcile card payments."

    def handle(self, *args, **options):
        self.stdout.write(json.dumps(MaintenanceService.tick(), default=str))
