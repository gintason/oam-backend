"""
Check the VTU.ng connection without buying anything.

    python manage.py vtung_check

Shows which API is in use (new key-based v1, or the old username/password),
the VTU.ng wallet balance, and how many MTN data plans load.
"""
from django.core.management.base import BaseCommand

from integrations.base import ProviderFactory


class Command(BaseCommand):
    help = "Read-only VTU.ng connection check (balance + data plans)."

    def handle(self, *args, **opts):
        vtu = ProviderFactory.get("vtu")
        v1 = getattr(vtu, "v1", None)
        self.stdout.write(f"Provider: {vtu.provider_key} · API: {'NEW Partner API (v1, secret key)' if v1 else 'OLD (username/password)'}")
        if v1:
            try:
                bal = v1.get_balance("NGN")
                self.stdout.write(f"VTU.ng wallet balance: {'unknown' if bal is None else f'NGN {bal:,}'}")
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(f"Balance check failed: {exc} {getattr(exc, 'raw', '') or ''}"))
        try:
            plans = vtu.list_variations("data", "MTN")
            self.stdout.write(f"MTN data plans loaded: {len(plans)}"
                              + (f" (e.g. {plans[0]['name']} = NGN {plans[0]['price']})" if plans else ""))
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.ERROR(f"Data plans failed: {exc} {getattr(exc, 'raw', '') or ''}"))
