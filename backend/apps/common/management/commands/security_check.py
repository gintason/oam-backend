"""
Production-readiness audit. Run: python manage.py security_check

Checks the settings that actually bite in production: debug mode, secret key,
allowed hosts, database, token lifetimes, provider keys, and HTTPS settings.
Prints PASS / WARN / FAIL per item so you know exactly what to fix before deploy.
"""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"


class Command(BaseCommand):
    help = "Audit settings for production readiness."

    def handle(self, *args, **opts):
        results = []

        def check(name, status, detail=""):
            results.append((name, status, detail))

        # --- 1. DEBUG ---
        if getattr(settings, "DEBUG", False):
            check("DEBUG is off", FAIL, "DEBUG=True leaks stack traces + settings. Set DEBUG=False in prod.")
        else:
            check("DEBUG is off", PASS)

        # --- 2. SECRET_KEY ---
        key = getattr(settings, "SECRET_KEY", "")
        if not key or "change-me" in key or len(key) < 40:
            check("SECRET_KEY is strong", FAIL,
                  "Still the placeholder or too short. Generate a new 50+ char random key.")
        else:
            check("SECRET_KEY is strong", PASS)

        # --- 3. ALLOWED_HOSTS ---
        hosts = getattr(settings, "ALLOWED_HOSTS", [])
        if "*" in hosts:
            check("ALLOWED_HOSTS restricted", FAIL, "'*' allows any host. List your real domains.")
        elif not hosts or hosts == ["localhost", "127.0.0.1"]:
            check("ALLOWED_HOSTS restricted", WARN, "Only localhost. Add your production domain.")
        else:
            check("ALLOWED_HOSTS restricted", PASS, str(hosts))

        # --- 4. Database ---
        engine = settings.DATABASES.get("default", {}).get("ENGINE", "")
        if "sqlite" in engine:
            check("Database is Postgres", FAIL,
                  "SQLite can't handle concurrent writes safely — a real risk for a money ledger.")
        else:
            check("Database is Postgres", PASS, engine.split(".")[-1])

        # --- 5. JWT access token lifetime ---
        jwt = getattr(settings, "SIMPLE_JWT", {})
        life = jwt.get("ACCESS_TOKEN_LIFETIME")
        if isinstance(life, timedelta) and life > timedelta(hours=1):
            check("JWT access token short-lived", FAIL,
                  f"ACCESS_TOKEN_LIFETIME={life}. Use 15-30 minutes in production.")
        else:
            check("JWT access token short-lived", PASS, str(life))

        # --- 6. HTTPS / cookie security ---
        https_items = {
            "SECURE_SSL_REDIRECT": True,
            "SESSION_COOKIE_SECURE": True,
            "CSRF_COOKIE_SECURE": True,
        }
        missing = [k for k, want in https_items.items()
                   if getattr(settings, k, False) is not want]
        if missing and not settings.DEBUG:
            check("HTTPS/cookie security", WARN, f"Not set: {', '.join(missing)}")
        elif missing:
            check("HTTPS/cookie security", WARN, "Set these in production settings.")
        else:
            check("HTTPS/cookie security", PASS)

        hsts = getattr(settings, "SECURE_HSTS_SECONDS", 0)
        check("HSTS enabled", PASS if hsts else WARN,
              "" if hsts else "Set SECURE_HSTS_SECONDS=31536000 in prod.")

        # --- 7. Provider keys present ---
        pc = getattr(settings, "PROVIDER_CONFIG", {})
        pay_key = pc.get("payments", {}).get("paystack", {}).get("secret_key", "")
        if not pay_key:
            check("Paystack key set", WARN, "PAYSTACK_SECRET_KEY empty.")
        elif pay_key.startswith("sk_test"):
            check("Paystack key set", WARN, "Using a TEST key — swap to sk_live for production.")
        else:
            check("Paystack key set", PASS, "live key")

        vtu = pc.get("vtu", {}).get("vtung", {})
        check("VTU credentials set",
              PASS if (vtu.get("username") and vtu.get("password")) else WARN,
              "" if vtu.get("password") else "VTU_NG_* missing.")

        # --- 8. Active providers (no mocks in prod) ---
        providers = getattr(settings, "DEFAULT_PROVIDERS", {})
        mocks = [k for k, v in providers.items() if v == "mock"]
        if mocks:
            check("No mock providers", FAIL,
                  f"Mock still active for: {', '.join(mocks)} — real money won't move.")
        else:
            check("No mock providers", PASS)

        # --- 9. Celery eager mode ---
        if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            check("Celery async", FAIL,
                  "CELERY_TASK_ALWAYS_EAGER=True runs tasks synchronously. Turn off in prod.")
        else:
            check("Celery async", PASS)

        # --- report ---
        self.stdout.write("\n" + "=" * 62)
        self.stdout.write("  PRODUCTION READINESS AUDIT")
        self.stdout.write("=" * 62)
        for name, status, detail in results:
            style = {PASS: self.style.SUCCESS, WARN: self.style.WARNING,
                     FAIL: self.style.ERROR}[status]
            self.stdout.write(f"  {style(status.ljust(5))} {name}")
            if detail:
                self.stdout.write(f"        └─ {detail}")
        fails = sum(1 for _, s, _ in results if s == FAIL)
        warns = sum(1 for _, s, _ in results if s == WARN)
        self.stdout.write("=" * 62)
        if fails:
            self.stdout.write(self.style.ERROR(
                f"  {fails} BLOCKER(S), {warns} warning(s) — NOT production ready."))
        elif warns:
            self.stdout.write(self.style.WARNING(
                f"  0 blockers, {warns} warning(s) — review before deploying."))
        else:
            self.stdout.write(self.style.SUCCESS("  All checks passed."))
        self.stdout.write("=" * 62 + "\n")
