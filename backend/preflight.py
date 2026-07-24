"""
Pre-deployment check.

Reports what's ready and what would break in production. Read-only — it changes
nothing.

Most of these are things that work perfectly on a laptop and fail the moment
the app is public: DEBUG left on, a secret key committed to git, a database that
deletes itself after 30 days.

RUN FROM THE BACKEND ROOT:
    python3 manage.py shell < preflight.py
"""
import os
import pathlib

from django.conf import settings

OK, WARN, FAIL = "  [ok]  ", "  [warn]", "  [FAIL]"
issues = {"fail": 0, "warn": 0}


def check(label, condition, detail="", severity="fail"):
    if condition:
        print(f"{OK} {label}")
        return True
    marker = FAIL if severity == "fail" else WARN
    issues[severity if severity in issues else "fail"] += 1
    print(f"{marker} {label}")
    if detail:
        for line in detail.strip().splitlines():
            print(f"          {line.strip()}")
    return False


print("\n" + "=" * 66)
print("  OAM — PRE-DEPLOYMENT CHECK")
print("=" * 66)

# ---------------------------------------------------------------- core ---
print("\nCORE SETTINGS")

check(
    "DEBUG is off",
    not settings.DEBUG,
    "DEBUG=True in production exposes your settings, your database "
    "credentials and a full traceback to anyone who triggers an error. "
    "Set DJANGO_SETTINGS_MODULE to your production settings on Render.",
)

secret = getattr(settings, "SECRET_KEY", "")
check(
    "SECRET_KEY comes from the environment",
    bool(os.environ.get("DJANGO_SECRET_KEY") or os.environ.get("SECRET_KEY")),
    "A key hardcoded in settings is in your git history forever. Anyone with "
    "it can forge session cookies and password-reset tokens. Generate a new "
    "one for production and set it as an environment variable.",
    severity="warn",
)

check(
    "SECRET_KEY is not the Django default",
    not secret.startswith("django-insecure-"),
    "This is the placeholder Django generates. It must not be used in production.",
)

hosts = getattr(settings, "ALLOWED_HOSTS", [])
check(
    "ALLOWED_HOSTS is set",
    bool(hosts) and hosts != ["*"],
    f"Currently {hosts!r}. Set it to your real domains, e.g.\n"
    "  api.oam-app.com, oam-platform-api.onrender.com\n"
    "'*' accepts any Host header, which enables cache-poisoning and "
    "password-reset links pointing at an attacker's domain.",
)

# ------------------------------------------------------------- database ---
print("\nDATABASE")

db = settings.DATABASES.get("default", {})
engine = db.get("ENGINE", "")
check("PostgreSQL, not SQLite", "postgresql" in engine,
      f"Engine is {engine}. SQLite on Render lives on an ephemeral disk and is "
      "erased on every deploy — taking every wallet balance with it.")
check(
    "DATABASE_URL is used",
    bool(os.environ.get("DATABASE_URL")),
    "Render provides DATABASE_URL. Read it with dj-database-url rather than "
    "hardcoding credentials.",
    severity="warn",
)

# --------------------------------------------------------------- https ---
print("\nHTTPS AND COOKIES")

check("SECURE_SSL_REDIRECT", getattr(settings, "SECURE_SSL_REDIRECT", False),
      "Without it, a request over plain HTTP is served rather than redirected — "
      "and any token sent with it travels in clear text.", severity="warn")
check("SESSION_COOKIE_SECURE", getattr(settings, "SESSION_COOKIE_SECURE", False),
      "Stops the session cookie being sent over plain HTTP.", severity="warn")
check("CSRF_COOKIE_SECURE", getattr(settings, "CSRF_COOKIE_SECURE", False),
      severity="warn")
check("HSTS is set", getattr(settings, "SECURE_HSTS_SECONDS", 0) >= 3600,
      "SECURE_HSTS_SECONDS tells browsers to refuse plain HTTP for your domain. "
      "Start at 3600 while testing, raise to 31536000 once you're confident.",
      severity="warn")

trusted = getattr(settings, "CSRF_TRUSTED_ORIGINS", [])
check("CSRF_TRUSTED_ORIGINS includes your frontend", bool(trusted),
      "Needs the full scheme, e.g. https://app.oam-app.com", severity="warn")

cors = getattr(settings, "CORS_ALLOWED_ORIGINS", None)
allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
check("CORS is restricted to your frontend", bool(cors) and not allow_all,
      f"CORS_ALLOWED_ORIGINS={cors!r}, CORS_ALLOW_ALL_ORIGINS={allow_all}. "
      "Allowing every origin lets any site call your API with a user's "
      "credentials attached.")

# --------------------------------------------------------------- static ---
print("\nSTATIC FILES")
check("STATIC_ROOT is set", bool(getattr(settings, "STATIC_ROOT", None)),
      "collectstatic needs somewhere to write. Set STATIC_ROOT = BASE_DIR / 'staticfiles'.")
check("WhiteNoise is installed",
      any("whitenoise" in m.lower() for m in settings.MIDDLEWARE),
      "Django won't serve static files with DEBUG=False. WhiteNoise does it "
      "without a separate CDN — add whitenoise to requirements and put "
      "WhiteNoiseMiddleware directly after SecurityMiddleware.",
      severity="warn")

# ------------------------------------------------------------ providers ---
print("\nTHIRD-PARTY SERVICES")

def env_check(label, *names, severity="warn", detail=""):
    check(label, any(os.environ.get(n) for n in names), detail, severity=severity)

env_check("Paystack keys", "PAYSTACK_SECRET_KEY", "PAYSTACK_SECRET",
          detail="Payments and withdrawals need these. Use LIVE keys in production.")
env_check("VTU provider credentials", "VTU_USERNAME", "VTUNG_USERNAME", "VTU_NG_USERNAME",
          detail="Bill purchases fail without these.")
env_check("Cloudinary", "CLOUDINARY_CLOUD_NAME",
          detail="Photo and document uploads fail without these.")
env_check("Email host", "EMAIL_HOST", "DJANGO_EMAIL_HOST",
          detail="OTPs, password resets and receipts all depend on this.")
env_check("Assistant API key (optional)", "ANTHROPIC_API_KEY",
          detail="Without it the assistant answers from its knowledge base, which is fine.")

# ------------------------------------------------------------ live keys ---
print("\nLIVE vs TEST KEYS")
paystack = os.environ.get("PAYSTACK_SECRET_KEY", "") or os.environ.get("PAYSTACK_SECRET", "")
if paystack.startswith("sk_test"):
    print(f"{WARN} Paystack is using TEST keys")
    print("          Real customers' cards will be declined. Switch to sk_live_ when ready.")
    issues["warn"] += 1
elif paystack.startswith("sk_live"):
    print(f"{OK} Paystack is using LIVE keys")
else:
    print(f"{WARN} Couldn't identify the Paystack key type")
    issues["warn"] += 1

# ---------------------------------------------------------------- files ---
print("\nREPOSITORY HYGIENE")
root = pathlib.Path(".")
gitignore = (root / ".gitignore")
ignored = gitignore.read_text() if gitignore.exists() else ""
check(".env is git-ignored", ".env" in ignored,
      "Your Paystack secret, database password and Django key live in .env.")

# ----------------------------------------------------------- scheduling ---
print("\nSCHEDULED WORK")
print(f"{WARN} settle_bill_orders needs a Render Cron Job")
print("          Without it, a customer who closes the app during a slow")
print("          delivery never gets their electricity token. Command:")
print("            python manage.py settle_bill_orders --apply")
print("          Suggested schedule: */2 * * * *")
issues["warn"] += 1

# --------------------------------------------------------------- verdict ---
print("\n" + "=" * 66)
if issues["fail"]:
    print(f"  {issues['fail']} blocking issue(s), {issues['warn']} warning(s).")
    print("  Fix the blocking ones before going live.")
else:
    print(f"  No blocking issues. {issues['warn']} warning(s) to review.")
print("=" * 66 + "\n")
