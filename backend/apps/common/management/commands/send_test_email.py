"""
python manage.py send_test_email you@example.com

Sends one test email with the current settings and says exactly what happened.
Never prints passwords or API keys.
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Send a test email to check that OTP/receipt emails can be delivered."

    def add_arguments(self, parser):
        parser.add_argument("to")

    def handle(self, *args, **opts):
        backend = settings.EMAIL_BACKEND
        self.stdout.write(f"Backend: {backend}")
        if backend.endswith("ApiEmailBackend"):
            self.stdout.write(f"Provider: {settings.EMAIL_API_PROVIDER or 'MISSING'}  key: {'set' if settings.EMAIL_API_KEY else 'MISSING'}")
        elif backend.endswith("smtp.EmailBackend"):
            self.stdout.write(f"SMTP: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}  user: {settings.EMAIL_HOST_USER or '-'}")
        elif backend.endswith("console.EmailBackend"):
            self.stdout.write(self.style.WARNING("Console backend: emails are only printed, never sent. Set EMAIL_API_PROVIDER + EMAIL_API_KEY."))
        self.stdout.write(f"From: {settings.DEFAULT_FROM_EMAIL}")
        msg = EmailMultiAlternatives("O.A.M test email", "If you can read this, OAM emails work.",
                                     settings.DEFAULT_FROM_EMAIL, [opts["to"]])
        msg.attach_alternative("<p>If you can read this, <b>OAM emails work</b>.</p>", "text/html")
        try:
            msg.send(fail_silently=False)
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.ERROR(f"FAILED: {exc}"))
            if "timed out" in str(exc).lower() and backend.endswith("smtp.EmailBackend"):
                self.stdout.write("  SMTP timed out: Render's free plan blocks outgoing SMTP ports. "
                                  "Use EMAIL_API_PROVIDER=resend or brevo with EMAIL_API_KEY instead.")
            return
        self.stdout.write(self.style.SUCCESS(f"Sent to {opts['to']} - check the inbox (and spam)."))
