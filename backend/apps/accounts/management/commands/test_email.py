"""
Verify the email backend actually works.

    python manage.py test_email you@example.com

Sends a sample OTP message and reports exactly what happened, so you can
confirm SMTP credentials before wiring email into the signup flow.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.emails import send_otp_email


class Command(BaseCommand):
    help = "Send a test OTP email to check the mail configuration."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Email address to send the test to.")

    def handle(self, *args, **opts):
        recipient = opts["recipient"]

        backend = settings.EMAIL_BACKEND
        self.stdout.write("")
        self.stdout.write(f"  Backend : {backend}")
        self.stdout.write(f"  Host    : {getattr(settings, 'EMAIL_HOST', '—')}"
                          f":{getattr(settings, 'EMAIL_PORT', '—')}")
        self.stdout.write(f"  User    : {getattr(settings, 'EMAIL_HOST_USER', '—') or '(not set)'}")
        self.stdout.write(f"  From    : {getattr(settings, 'DEFAULT_FROM_EMAIL', '—')}")
        self.stdout.write(f"  To      : {recipient}")
        self.stdout.write("")

        if "console" in backend:
            self.stdout.write(self.style.WARNING(
                "  Console backend active — the email prints below instead of sending.\n"
                "  Set EMAIL_HOST_USER + EMAIL_HOST_PASSWORD in .env to send for real.\n"))

        ok = send_otp_email(destination=recipient, code="123456",
                            purpose="signup", ttl_minutes=5)

        self.stdout.write("")
        if ok:
            self.stdout.write(self.style.SUCCESS(f"  Sent. Check {recipient} (and spam)."))
        else:
            raise CommandError(
                "Send FAILED. Read the logged error above, then check:\n"
                "  • 'timed out' / 'connection refused' -> the PORT is blocked or wrong.\n"
                "      Many ISPs block 587. Test both:\n"
                "        nc -zv -w 5 <EMAIL_HOST> 587\n"
                "        nc -zv -w 5 <EMAIL_HOST> 465\n"
                "      Port 465 needs EMAIL_USE_SSL=True + EMAIL_USE_TLS=False.\n"
                "      Port 587 needs EMAIL_USE_TLS=True + EMAIL_USE_SSL=False.\n"
                "      (Exactly one of TLS/SSL must be True.)\n"
                "  • 'authentication failed' -> wrong EMAIL_HOST_USER / EMAIL_HOST_PASSWORD.\n"
                "      Use the FULL address as the username. If the password contains\n"
                "      special characters, single-quote it in .env.\n"
                "  • Gmail specifically -> requires an App Password (2FA must be on).\n"
                "  • If all ports are blocked, use an HTTPS email API (SendGrid/Resend/\n"
                "      Mailgun) instead of SMTP -- they send over 443, which is never blocked."
            )
