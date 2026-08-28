from django.core.management.base import BaseCommand

from apps.billing.models import Biller

# vtu.ng betting providers (service_id == provider name, case-sensitive).
PROVIDERS = [
    "1xBet", "BangBet", "Bet9ja", "BetKing", "BetLand", "BetLion", "BetWay",
    "CloudBet", "LiveScoreBet", "MerryBet", "NaijaBet", "NairaBet",
    "SportyBet", "SupaBet",
]


class Command(BaseCommand):
    help = "Seed the Nigerian betting providers as billers (category=betting)."

    def handle(self, *args, **options):
        created = 0
        for name in PROVIDERS:
            _, was_created = Biller.objects.get_or_create(
                country="NG", category="betting", code=name,
                defaults={"name": name, "is_active": True},
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Betting billers ready ({created} created, {len(PROVIDERS)} total)."))
