"""Seed home-service categories. Run: python manage.py seed_service_categories"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.homeservices.models import ServiceCategory

CATEGORIES = [
    "Mechanic", "Plumber", "Electrician", "Carpenter", "Painter",
    "AC Technician", "Generator Repair", "Tiler", "Welder", "Bricklayer",
    "Hairdresser", "Barber", "Tailor", "Cleaner", "Caterer",
    "Photographer", "DJ", "Makeup Artist", "Solar Installer", "Plasterer",
]


class Command(BaseCommand):
    help = "Seed home-service categories."

    def handle(self, *args, **opts):
        created = 0
        for order, name in enumerate(CATEGORIES):
            _, was = ServiceCategory.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name, "is_active": True, "order": order},
            )
            created += int(was)
        self.stdout.write(self.style.SUCCESS(
            f"Seeded service categories. {created} new, {ServiceCategory.objects.count()} total."
        ))
