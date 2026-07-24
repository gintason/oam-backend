"""Seed marketplace categories. Run: python manage.py seed_categories"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.marketplace.models import Category

CATEGORIES = [
    ("Electronics", False), ("Phones", False), ("Computers", False),
    ("Automobiles", False), ("Household Appliances", False), ("Real Estate", False),
    ("Fashion", False), ("Furniture", False),
    ("OAM MOTORS", True),        # admin-only
]


class Command(BaseCommand):
    help = "Seed marketplace categories."

    def handle(self, *args, **opts):
        created = 0
        for order, (name, admin_only) in enumerate(CATEGORIES):
            _, was = Category.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name, "is_admin_only": admin_only,
                          "is_active": True, "order": order},
            )
            created += int(was)
        self.stdout.write(self.style.SUCCESS(
            f"Seeded categories. {created} new, {Category.objects.count()} total."
        ))
