# Deploying OAM to Render

Roughly 45 minutes end to end, most of it waiting for builds.

---

## Before you start

```bash
cd /Users/mac/Desktop/oam-platform/backend
python3 manage.py shell < preflight.py
```

Read the output before going further. It checks the things that work fine on a
laptop and fail the moment the app is public — `DEBUG` left on, a secret key
sitting in git, SQLite instead of Postgres.

---

## 1. Backend files

```bash
cd /Users/mac/Desktop/oam-platform/backend
cp production.py config/settings/production.py
cp build.sh .
chmod +x build.sh
cat requirements-additions.txt >> requirements.txt
```

Then open `requirements.txt` and tidy any duplicates.

Commit:

```bash
cd /Users/mac/Desktop/oam-platform
git add -A
git commit -m "Add production settings and Render build"
git push
```

---

## 2. Create the database first

Render dashboard → **New → PostgreSQL**. Name it `oam-db`.

**The free tier expires after 30 days and is capped at 1GB.** That is fine for a
staging environment and completely unsuitable for real customers: a database
that deletes itself takes every wallet balance and order record with it. Before
you take real money, move to a paid plan.

Copy the **Internal Database URL**.

---

- postgresql://oam_platform_user:1RjtElzdjtoD5SrmsdstHH4q1szY4Z7a@dpg-d9hpaln15fvs739kjat0-a/oam_platform

## 3. Backend service

**New → Web Service**, connect the repo.

| Setting           | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Root directory    | `backend`                                                    |
| Runtime           | Python 3                                                     |
| Build command     | `./build.sh`                                                 |
| Start command     | `gunicorn config.wsgi:application --workers 2 --timeout 120` |
| Health check path | `/api/v1/homeservices/featured/`                             |

### Environment variables

```
DJANGO_SETTINGS_MODULE = config.settings.production
DJANGO_SECRET_KEY      = <generate a new one — see below>
DATABASE_URL           = <internal URL from step 2>
ALLOWED_HOSTS          = oam-api.onrender.com,api.oam-app.com
FRONTEND_URL           = https://oam-web.onrender.com
CORS_ALLOWED_ORIGINS   = https://oam-web.onrender.com
CSRF_TRUSTED_ORIGINS   = https://oam-web.onrender.com

PAYSTACK_SECRET_KEY    = sk_live_...
PAYSTACK_PUBLIC_KEY    = pk_live_...
CLOUDINARY_CLOUD_NAME  = ...
CLOUDINARY_API_KEY     = ...
CLOUDINARY_API_SECRET  = ...
EMAIL_HOST             = mail.oam-app.com
EMAIL_PORT             = 465
EMAIL_USE_SSL          = True
EMAIL_HOST_USER        = info@oam-app.com
EMAIL_HOST_PASSWORD    = ...
DEFAULT_FROM_EMAIL     = OAM App <info@oam-app.com>

ANTHROPIC_API_KEY      = sk-ant-...   (optional — the assistant works without it)
```

Plus your vtu.ng and Africa's Talking variables — copy the names from your local
`.env`.

Generate a fresh secret key:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Use a new one.** If your development key has ever been committed, it's in your
git history permanently, and anyone with it can forge session cookies and
password-reset tokens.

---

## 4. Frontend service

**New → Static Site**, same repo.

| Setting           | Value                     |
| ----------------- | ------------------------- |
| Root directory    | `frontend`                |
| Build command     | `npm ci && npm run build` |
| Publish directory | `dist`                    |

Environment variable:

```
VITE_API_URL = https://oam-api.onrender.com/api/v1
```

### The redirect rule you must not skip

**Redirects/Rewrites** → add:

| Source | Destination   | Type    |
| ------ | ------------- | ------- |
| `/*`   | `/index.html` | Rewrite |

Without this, refreshing on `/dashboard` returns 404. The browser asks the
server for a file that doesn't exist, because your routing is client-side. It
works while you click around and breaks the moment anyone reloads or opens a
link directly — which is exactly what a customer following an emailed receipt
does.

---

## 5. Cron job for token delivery

**New → Cron Job**

| Setting        | Value                                         |
| -------------- | --------------------------------------------- |
| Root directory | `backend`                                     |
| Schedule       | `*/5 * * * *`                                 |
| Build command  | `pip install -r requirements.txt`             |
| Command        | `python manage.py settle_bill_orders --apply` |

Same `DJANGO_SETTINGS_MODULE`, `DATABASE_URL` and `DJANGO_SECRET_KEY` as the API.

**This one matters more than it looks.** The Orders page chases the provider
while a customer is watching. The cron job covers everyone who closed the app —
without it, someone who buys electricity and locks their phone never gets their
token. Cron jobs aren't on the free plan.

---

## 6. Create your admin account

Render dashboard → the API service → **Shell**:

```bash
python manage.py createsuperuser
```

---

## 7. Point the webhooks at production

**Paystack** → Settings → API Keys & Webhooks:

```
https://oam-api.onrender.com/api/v1/payments/webhook/paystack/
```

**vtu.ng** — ask them to enable delivery callbacks pointing at:

```
https://oam-api.onrender.com/api/v1/billing/webhook/vtung/
```

A `GET` on that URL should return **405** (method not allowed). That means it's
routed and alive. A 404 means your URL prefix differs.

---

## 8. Check it works

- [ ] Landing page loads
- [ ] Register a new account — the OTP email arrives
- [ ] Sign in
- [ ] **Refresh the page while on `/dashboard`** — proves the rewrite rule works
- [ ] Fund the wallet with a small real amount
- [ ] Buy ₦100 of airtime
- [ ] Buy ₦1,000 of electricity and confirm the token arrives on its own
- [ ] Check the receipt email
- [ ] Post a marketplace listing with a photo
- [ ] Message it from a second account

---

## Free tier, honestly

|             | Limit                                                             |
| ----------- | ----------------------------------------------------------------- |
| Web service | Sleeps after 15 min idle; first request then takes up to a minute |
| PostgreSQL  | 1GB, **expires after 30 days**                                    |
| Cron jobs   | Not available                                                     |

Fine for testing with people you know. Before real customers: paid database
(non-negotiable — it deletes itself), paid API instance (a cold start on a
payment redirect looks like a failed payment), and a paid plan for the cron job.

---

## Custom domain

Render → service → **Settings → Custom Domain**.

Suggested split, which lets your countdown page keep running:

| Domain            | Points at                               |
| ----------------- | --------------------------------------- |
| `api.oam-app.com` | backend                                 |
| `app.oam-app.com` | frontend                                |
| `oam-app.com`     | stays on the countdown until launch day |

After adding domains, update `ALLOWED_HOSTS`, `FRONTEND_URL`,
`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` and `VITE_API_URL`, then redeploy
both services.

---

## When something breaks

**502 on the API** — the app failed to start. Check the logs for a missing
environment variable; `DJANGO_SECRET_KEY` has no default on purpose, so its
absence stops the deploy rather than silently using something predictable.

**CORS errors in the browser console** — `CORS_ALLOWED_ORIGINS` must contain the
frontend origin with its scheme, no trailing slash.

**404 on refresh** — the rewrite rule in step 4.

**Static files missing in Django admin** — `collectstatic` failed, or WhiteNoise
isn't in `MIDDLEWARE`.

**Payments succeed but nothing is delivered** — the Paystack webhook is still
pointing at localhost.
