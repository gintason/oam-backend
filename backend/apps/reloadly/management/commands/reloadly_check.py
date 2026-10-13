"""
python manage.py reloadly_check

Checks the Reloadly (international airtime) setup end to end and says, in
plain words, what's wrong. Never prints the secret.
"""
from django.core.management.base import BaseCommand

from apps.reloadly import services
from apps.reloadly.services import ReloadlyClient, ReloadlyError


class Command(BaseCommand):
    help = "Diagnose the Reloadly international airtime connection."

    def handle(self, *args, **opts):
        c = ReloadlyClient()
        mode = services._mode()
        self.stdout.write(f"Mode:          {mode}  (RELOADLY_MODE; 'live' for real top-ups)")
        self.stdout.write(f"API:           {c.base_url}")
        cid = c.client_id or ""
        self.stdout.write(f"Client ID:     {'set (' + cid[:4] + '…' + cid[-2:] + ')' if cid else 'MISSING'}")
        self.stdout.write(f"Client secret: {'set' if c.client_secret else 'MISSING'}")
        if not cid or not c.client_secret:
            self.stdout.write(self.style.ERROR(
                "Add RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET to the backend's Environment on Render "
                "(Reloadly dashboard > Developers > API settings)."))
            return

        try:
            c._access_token()
            self.stdout.write(self.style.SUCCESS("Login:         OK"))
        except ReloadlyError as exc:
            self.stdout.write(self.style.ERROR(f"Login:         FAILED - {exc}"))
            self.stdout.write(
                "  Most common causes:\n"
                "  - Wrong ID/secret, or extra spaces when pasting them into Render.\n"
                "  - Mode mismatch: live keys need RELOADLY_MODE=live; test keys need RELOADLY_MODE=sandbox.\n"
                "  - The Reloadly account isn't activated for live use yet (finish KYC in the dashboard).\n"
                "  The full reply from Reloadly is in the log line just above.")
            return

        try:
            n = len(c.countries() or [])
            self.stdout.write(self.style.SUCCESS(f"Countries:     OK ({n})"))
        except ReloadlyError as exc:
            self.stdout.write(self.style.ERROR(f"Countries:     FAILED - {exc}"))

        try:
            b = c.balance()
            self.stdout.write(f"Balance:       {b.get('balance')} {b.get('currencyCode', '')}")
            try:
                if float(b.get("balance") or 0) <= 0:
                    self.stdout.write(self.style.WARNING(
                        "  Your Reloadly balance is empty - top-ups will fail until you fund it."))
            except (TypeError, ValueError):
                pass
        except ReloadlyError as exc:
            self.stdout.write(self.style.WARNING(f"Balance:       couldn't read - {exc}"))
