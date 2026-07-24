"""
Production settings for Render.

Imports everything from base and overrides only what must differ. Every value
that varies by environment — or that must never appear in git — comes from an
environment variable.

Save as config/settings/production.py and set on Render:
    DJANGO_SETTINGS_MODULE = config.settings.production
"""
import os

import dj_database_url

from .base import *  # noqa: F401,F403
from .base import BASE_DIR, INSTALLED_APPS, MIDDLEWARE

# --------------------------------------------------------------------------- #
# Core
# --------------------------------------------------------------------------- #

DEBUG = False

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]  # deliberately no default: a
# missing key should stop the deploy, not silently fall back to something
# predictable and shared.

# Render sets RENDER_EXTERNAL_HOSTNAME automatically.
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
_render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if _render_host:
    ALLOWED_HOSTS.append(_render_host)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://app.oam-app.com").rstrip("/")

# --------------------------------------------------------------------------- #
# Database
# --------------------------------------------------------------------------- #

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL", ""),
        conn_max_age=600,           # reuse connections; Postgres handshakes are
        conn_health_checks=True,    # slow, and Render's network adds latency
        ssl_require=True,
    )
}

# --------------------------------------------------------------------------- #
# HTTPS
# --------------------------------------------------------------------------- #

# Render terminates TLS at its proxy and forwards this header. Without it Django
# believes every request is plain HTTP and redirects forever.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Start at an hour. Raise to 31536000 once you're confident — HSTS is hard to
# undo, because browsers remember it.
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", 3600))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", FRONTEND_URL).split(",")
    if o.strip()
]

# --------------------------------------------------------------------------- #
# CORS — the frontend is on a different origin
# --------------------------------------------------------------------------- #

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", FRONTEND_URL).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

# --------------------------------------------------------------------------- #
# Static files
# --------------------------------------------------------------------------- #

STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"

if "whitenoise.runserver_nostatic" not in INSTALLED_APPS:
    INSTALLED_APPS.insert(0, "whitenoise.runserver_nostatic")

if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    _i = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1
    MIDDLEWARE.insert(_i, "whitenoise.middleware.WhiteNoiseMiddleware")

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# --------------------------------------------------------------------------- #
# Logging — Render captures stdout
# --------------------------------------------------------------------------- #

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{levelname} {asctime} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        # These carry the money paths. Keep them findable in Render's log search.
        "billing": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "accounts": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "assistant": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}
