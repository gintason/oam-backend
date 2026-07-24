# OAM Platform — Backend (Phase 0: Foundation)

Django + DRF + PostgreSQL backend for the OAM travel/commerce/lifestyle super-app.
This phase delivers the project skeleton, the 12-language i18n setup, and the
third-party integration scaffolding. No money-moving features yet — that's Phase 1.

## What's in here

```
backend/
├── config/            # project: settings (base/dev/prod/test), celery, urls, wsgi/asgi
├── apps/
│   └── common/        # base models (UUID/timestamp/Immutable), i18n helpers, health+languages API
├── integrations/
│   └── base/          # ⭐ provider scaffolding: client, interfaces, registry/factory, DTOs, exceptions
├── tasks/             # Celery tasks (one ping task for now)
└── locale/            # gettext catalogues, one folder per language
```

## Languages (12)

English, Chinese (Simplified), Spanish, French, Arabic*, Hindi, Portuguese,
Russian, Bengali, Indonesian, German, Urdu*.  (* = right-to-left)

Three layers cover "multilingual":
1. **Static UI strings / emails / errors** → Django gettext (`locale/*`), served per
   request via `Accept-Language` and `LocaleMiddleware`.
2. **Dynamic model content** (category names, CMS text) → `django-modeltranslation`.
3. **Direction (LTR/RTL)** → exposed by `GET /api/v1/languages/` so web/mobile flip layout.

## Run it locally

```bash
# 1. datastores
docker compose -f ../infra/docker-compose.yml up -d

# 2. python env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit secrets

# 3. database + run
python manage.py migrate
python manage.py runserver

# 4. background worker (separate terminal)
celery -A config worker -l info -Q default,payments,bookings,notifications,beat
celery -A config beat -l info
```

## Verify the setup

- `GET /api/v1/health/`        → `{"status": "ok"}`
- `GET /api/v1/languages/`     → active language, direction, and the 12-language list
  - try it with a header: `Accept-Language: ar`  → `"direction": "rtl"`
- `GET /api/docs/`             → Swagger UI

## Translation workflow

```bash
python manage.py makemessages -l ar -l zh_Hans -l es ...   # extract strings
# translators fill in locale/<lang>/LC_MESSAGES/django.po
python manage.py compilemessages                            # build .mo files
```

## Next: Phase 1

Wallet + immutable double-entry ledger + Paystack funding (with webhook ingestion
and Celery settlement), plus the `accounts` app for JWT auth/OTP.
