"""
Base settings shared by all environments.

Environment-specific overrides live in dev.py / prod.py / test.py.
Secrets and connection strings are read from the environment via django-environ.
"""
from pathlib import Path

import environ

# backend/config/settings/base.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------
# NOTE: 'modeltranslation' MUST come before django.contrib.admin so the admin
# picks up translated model fields.
INSTALLED_APPS = [
    "modeltranslation",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    "rest_framework_simplejwt.token_blacklist",

    # Local apps
    "apps.common",
    "apps.affiliates",      # affiliate link generation + click/conversion tracking
    # Domain apps are added phase by phase:
     "apps.accounts",
     "apps.wallet",
     "apps.payments",
     "apps.billing",
     "apps.payouts",
     "apps.marketplace",
     "apps.assistant",
     "apps.messaging",
     "apps.homeservices",
     "apps.uploads",
     "beneficiaries"
    # ...
]

# Use our custom user model instead of Django's default.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # LocaleMiddleware must sit AFTER SessionMiddleware and BEFORE CommonMiddleware.
    # It resolves the active language from (in order): URL prefix, session,
    # cookie, then the Accept-Language header sent by the web/mobile clients.
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.template.context_processors.i18n",  # enables {% trans %} + LANGUAGES
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://oam:oam@localhost:5432/oam"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = False  # we manage atomicity in services

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# Internationalisation  (12 languages, including RTL)
# --------------------------------------------------------------------------
# Django language codes. Chinese uses "zh-hans" (Simplified).
LANGUAGE_CODE = "en"

LANGUAGES = [
    ("en", "English"),
    ("zh-hans", "Chinese (Simplified)"),
    ("es", "Spanish"),
    ("fr", "French"),
    ("ar", "Arabic"),
    ("hi", "Hindi"),
    ("pt", "Portuguese"),
    ("ru", "Russian"),
    ("bn", "Bengali"),
    ("id", "Indonesian"),
    ("de", "German"),
    ("ur", "Urdu"),
]

# Languages that render right-to-left. The API exposes this so the web/mobile
# clients can flip layout direction (dir="rtl" / I18nManager.forceRTL).
RTL_LANGUAGES = {"ar", "ur"}

# Where gettext .po/.mo catalogues live (static UI strings, emails, errors).
LOCALE_PATHS = [BASE_DIR / "locale"]

# django-modeltranslation: which languages translatable MODEL FIELDS support
# (e.g. category names, CMS content, product descriptions).
MODELTRANSLATION_DEFAULT_LANGUAGE = "en"
MODELTRANSLATION_LANGUAGES = (
    "en", "zh-hans", "es", "fr", "ar", "hi",
    "pt", "ru", "bn", "id", "de", "ur",
)
MODELTRANSLATION_FALLBACK_LANGUAGES = ("en",)

USE_I18N = True
USE_TZ = True
TIME_ZONE = "UTC"

# --------------------------------------------------------------------------
# Static / media
# --------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# --------------------------------------------------------------------------
# DRF + JWT
# --------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "OAM Platform API",
    "DESCRIPTION": "Travel, commerce & lifestyle super-app backend.",
    "VERSION": "0.1.0",
}

# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

# --------------------------------------------------------------------------
# Celery / Redis
# --------------------------------------------------------------------------
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ACKS_LATE = True               # re-queue if a worker dies mid-task
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_ROUTES = {
    # Financial work gets its own queue so a notification backlog never delays it.
    "tasks.payments.*": {"queue": "payments"},
    "tasks.remittance.*": {"queue": "payments"},
    "tasks.travel.*": {"queue": "bookings"},
    "tasks.notifications.*": {"queue": "notifications"},
    "tasks.reconciliation.*": {"queue": "beat"},
}

# --------------------------------------------------------------------------
# Third-party provider selection (resolved by integrations.base.registry)
# --------------------------------------------------------------------------
# Maps each integration category -> the adapter key that is currently active.
# Adapters self-register; the factory looks the key up here.
#
# Integration STYLE per category:
#   payments   -> API        (Paystack / Flutterwave: money flows through us)
#   vtu        -> API        (bills/airtime/data via a VTU aggregator)
#   hotels     -> API        (Hotelbeds / Booking.com: real bookings)
#   flights    -> AFFILIATE  (Travelpayouts deep links)
#   carhire    -> AFFILIATE  (Travelpayouts deep links)
#   delivery   -> AFFILIATE  (Uber Eats affiliate link/code)
#   remittance -> AFFILIATE  (Wise / Lemfi / Remitly / Taptap links; API later)

def _provider(key, default=""):
    return env(key, default=default).split("#")[0].strip()

SUPPORTED_PAYMENT_CURRENCIES = [
    c.strip().upper()
    for c in env("SUPPORTED_PAYMENT_CURRENCIES", default="NGN").split(",")
    if c.strip()
]

DEFAULT_PROVIDERS = {
    "payments": _provider("DEFAULT_PROVIDER_PAYMENTS", "paystack"),
    "vtu": _provider("DEFAULT_PROVIDER_VTU", "default"),
    "hotels": _provider("DEFAULT_PROVIDER_HOTELS", "klook"),
    "flights": _provider("DEFAULT_PROVIDER_FLIGHTS", "travelpayouts"),
    "carhire": _provider("DEFAULT_PROVIDER_CARHIRE", "travelpayouts"),
    "transfers": _provider("DEFAULT_PROVIDER_TRANSFERS", "travelpayouts"),
    "delivery": _provider("DEFAULT_PROVIDER_DELIVERY", "ubereats"),
    "remittance": _provider("DEFAULT_PROVIDER_REMITTANCE", "wise"),
    "payouts": _provider("DEFAULT_PROVIDER_PAYOUTS", "mock"),
    "giftcards": _provider("DEFAULT_PROVIDER_GIFTCARDS", "g2a"),
}

# Per-(category, key) credentials/config. Adapters read their slice via the
# factory. Everything is sourced from the environment so no secret is committed.
PROVIDER_CONFIG = {
    "payments": {
        "paystack": {"secret_key": env("PAYSTACK_SECRET_KEY", default=""),
                     "public_key": env("PAYSTACK_PUBLIC_KEY", default="")},
        "flutterwave": {"secret_key": env("FLUTTERWAVE_SECRET_KEY", default=""),
                        "public_key": env("FLUTTERWAVE_PUBLIC_KEY", default=""),
                        "secret_hash": env("FLUTTERWAVE_SECRET_HASH", default=""),
                        "redirect_url": env("FLUTTERWAVE_REDIRECT_URL", default="")},
    },
    "vtu": {
        # Generic adapter — point it at your chosen aggregator (VTpass,
        # Reloadly, Flutterwave Bills, etc.).
        "default": {"base_url": env("VTU_BASE_URL", default=""),
                    "api_key": env("VTU_API_KEY", default=""),
                    "secret": env("VTU_SECRET", default="")},
        "vtung": {"username": env("VTU_NG_USERNAME", default=""),
                  "password": env("VTU_NG_PASSWORD", default=""),
                  "user_pin": env("VTU_NG_USER_PIN", default="")},
    },

    "hotels": {
        
        "klook": {"url": env("KLOOK_URL", default="")},

        "hotelbeds": {"api_key": env("HOTELBEDS_API_KEY", default=""),
                      "secret": env("HOTELBEDS_SECRET", default=""),
                      "base_url": env("HOTELBEDS_BASE_URL",
                                      default="https://api.test.hotelbeds.com")},
        "booking": {"api_key": env("BOOKING_API_KEY", default="")},
    },
   "flights":   {"travelpayouts": {"marker": env("TRAVELPAYOUTS_MARKER", default=""),
                                     "token": env("TRAVELPAYOUTS_TOKEN", default=""),
                                     "url": env("AVIASALES_URL", default="")}
                            },

    "carhire":   {"travelpayouts": {"marker": env("TRAVELPAYOUTS_MARKER", default=""),
                                     "token": env("TRAVELPAYOUTS_TOKEN", default=""),
                                     "url": env("GETRENTACAR_URL", default="")}
                                     
                            },

    "transfers": {"travelpayouts": {"marker": env("TRAVELPAYOUTS_MARKER", default=""),
                                     "token": env("TRAVELPAYOUTS_TOKEN", default=""),
                                     "url": env("WELCOMEPICKUPS_URL", default="")}
                            },
    "delivery": {
        "ubereats": {"affiliate_url": env("UBEREATS_AFFILIATE_URL", default=""),
                     "affiliate_code": env("UBEREATS_AFFILIATE_CODE", default="")},
    },
    "remittance": {
        "wise":   {"affiliate_url": env("WISE_AFFILIATE_URL", default=""),
                   "api_token": env("WISE_API_TOKEN", default="")},
        "lemfi":  {"affiliate_url": env("LEMFI_AFFILIATE_URL", default=""),
                   "api_token": env("LEMFI_API_TOKEN", default="")},
        "remitly": {"affiliate_url": env("REMITLY_AFFILIATE_URL", default="")},
        "taptap":  {"affiliate_url": env("TAPTAP_AFFILIATE_URL", default="")},
    },

    "payouts": {
        "paystack": {"secret_key": env("PAYSTACK_SECRET_KEY", default="")},
        "mock": {},
    },

    "giftcards": {"g2a": {"url": env("G2A_REFLINK", default="")}},


}


# --------------------------------------------------------------------------
# Currencies (wallet switches active currency by user country/location)
# --------------------------------------------------------------------------
SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"]
DEFAULT_CURRENCY = "NGN"


# --------------------------------------------------------------------------
# Social authentication (Google / Facebook / Apple)
# --------------------------------------------------------------------------
SOCIAL_AUTH = {
    "google":   {"client_ids": env.list("GOOGLE_CLIENT_IDS", default=[])},
    "facebook": {"app_id": env("FACEBOOK_APP_ID", default=""),
                 "app_secret": env("FACEBOOK_APP_SECRET", default="")},
    "apple":    {"client_ids": env.list("APPLE_CLIENT_IDS", default=[])},
}
# DEV ONLY: lets you test the link-or-create flow with token "MOCK".
# Must stay False in production (it is overridden there anyway).
SOCIAL_AUTH_ALLOW_MOCK = env.bool("SOCIAL_AUTH_ALLOW_MOCK", default=DEBUG)

EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)


# ---------------------------------------------------------------- email
APP_DISPLAY_NAME = env("APP_DISPLAY_NAME", default="OAM Platform")

EMAIL_HOST = env("EMAIL_HOST", default="mail.oam-app.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)      # ← ADDED
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default=f"{APP_DISPLAY_NAME} <{EMAIL_HOST_USER or 'no-reply@oam-app.com'}>",
)
EMAIL_TIMEOUT = 60

# Fall back to the console backend when no credentials are set, so local dev
# never breaks — the email just prints to the terminal instead.
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=("django.core.mail.backends.smtp.EmailBackend" if EMAIL_HOST_PASSWORD
             else "django.core.mail.backends.console.EmailBackend"),
)

PAYSTACK_CALLBACK_URL = env("PAYSTACK_CALLBACK_URL", default="")
FLUTTERWAVE_REDIRECT_URL = env("FLUTTERWAVE_REDIRECT_URL", default=PAYSTACK_CALLBACK_URL)

# Gateway used ONLY for Marketplace/Artisan listing-upgrade payments (Pro/
# Premium seller tiers and artisan boosts). Everything else uses
# DEFAULT_PROVIDERS["payments"]. Set to "paystack" to revert.
LISTING_UPGRADE_PROVIDER = env("LISTING_UPGRADE_PROVIDER", default="flutterwave")

# --- Cloudinary (file uploads) ----------------------------------------------
# The browser uploads straight to Cloudinary using a signature generated here,
# so large videos never pass through this server. The SECRET must stay
# server-side: it's what proves an upload was authorised by us.
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")


# --- Assistant --------------------------------------------------------------
# Optional. With a key, the assistant answers freely using a language model.
# Without one it falls back to answering from the built-in knowledge base, so
# the feature works either way and the button is never broken.
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
ASSISTANT_MODEL = env("ASSISTANT_MODEL", default="claude-sonnet-4-6")
