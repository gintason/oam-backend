"""Seed Nigerian billers. Run: python manage.py seed_billers"""
from django.core.management.base import BaseCommand

from apps.billing.models import Biller

NETWORKS = [("MTN", "MTN"), ("AIRTEL", "Airtel"), ("GLO", "Glo"), ("9MOBILE", "9mobile")]
CABLE = [("dstv", "DStv"), ("gotv", "GOtv"), ("startimes", "Startimes"), ("showmax", "Showmax")]
DISCOS = [
    ("ikeja-electric", "Ikeja Electric (IKEDC)"), ("eko-electric", "Eko Electric (EKEDC)"),
    ("kano-electric", "Kano Electric (KEDCO)"), ("portharcourt-electric", "Port Harcourt (PHED)"),
    ("jos-electric", "Jos Electric (JED)"), ("ibadan-electric", "Ibadan Electric (IBEDC)"),
    ("kaduna-electric", "Kaduna Electric (KAEDCO)"), ("abuja-electric", "Abuja Electric (AEDC)"),
    ("enugu-electric", "Enugu Electric (EEDC)"), ("benin-electric", "Benin Electric (BEDC)"),
    ("aba-electric", "Aba Electric (ABEDC)"), ("yola-electric", "Yola Electric (YEDC)"),
]


class Command(BaseCommand):
    help = "Seed Nigerian billers (airtime, data, cable, electricity)."

    def handle(self, *args, **opts):
        created = 0

        def add(category, code, name):
            nonlocal created
            _, was = Biller.objects.get_or_create(
                country="NG", category=category, code=code,
                defaults={"name": name, "is_active": True},
            )
            created += int(was)

        for category in ("airtime", "data"):
            for code, name in NETWORKS:
                add(category, code, name)
        for code, name in CABLE:
            add("cable", code, name)
        for code, name in DISCOS:
            add("electricity", code, name)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded billers. {created} new, {Biller.objects.count()} total."
        ))
