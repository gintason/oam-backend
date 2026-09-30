"""Keep side effects that must follow a model change regardless of entry point."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import EmployerProfile, EmployerSubscription


@receiver(post_save, sender=EmployerProfile)
def ensure_subscription(sender, instance, created, **kwargs):
    if created:
        EmployerSubscription.objects.get_or_create(employer=instance)
