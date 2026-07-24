OAM — production deployment on Render (step 6 of 6)
===================================================

START HERE
  cd /Users/mac/Desktop/oam-platform/backend
  unzip -o oam_deploy.zip
  python3 manage.py shell < preflight.py

  Read that output before anything else. It checks read-only and reports what
  would break in production.

FILES
  DEPLOY.md                  full step-by-step, ~45 minutes
  preflight.py               readiness check (changes nothing)
  production.py              -> config/settings/production.py
  build.sh                   Render build command
  render.yaml                Blueprint, if you'd rather not click through the UI
  requirements-additions.txt gunicorn, whitenoise, dj-database-url, psycopg

THE FOUR THINGS THAT USUALLY GO WRONG

  1. THE FREE DATABASE DELETES ITSELF AFTER 30 DAYS
     Render's free PostgreSQL is capped at 1GB and expires. That would take
     every wallet balance and order record with it. Fine for testing with
     people you know; genuinely unsuitable for real money. Budget for the paid
     plan before you launch.

  2. REFRESHING ON /dashboard RETURNS 404 WITHOUT A REWRITE RULE
     Your routing is client-side, so the server is asked for a file that
     doesn't exist. Everything works while you click around, then breaks the
     moment someone reloads — or follows a link from a receipt email, which is
     exactly what a customer does.
     Fix: Redirects/Rewrites -> /* to /index.html, type Rewrite.

  3. GENERATE A NEW SECRET KEY
     If your development key has ever been committed, it's in git history
     permanently, and anyone with it can forge session cookies and
     password-reset tokens. production.py reads DJANGO_SECRET_KEY with NO
     default, deliberately — a missing key stops the deploy rather than quietly
     falling back to something predictable.

  4. WEBHOOKS STILL POINT AT LOCALHOST
     After deploying, update Paystack and ask vtu.ng to point delivery
     callbacks at the new URL. Otherwise payments succeed and nothing is
     delivered — the worst failure mode you have, because the customer has paid.

ALSO WORTH KNOWING
  * Free web services sleep after 15 minutes. A cold start on a Paystack
    redirect looks exactly like a failed payment to the customer.
  * Cron jobs aren't on the free plan, and settle_bill_orders is what delivers
    tokens to anyone who closed the app. Without it they get nothing until they
    return.

SUGGESTED DOMAIN SPLIT
  api.oam-app.com   backend
  app.oam-app.com   frontend
  oam-app.com       keep the countdown until launch day

  That lets you test everything in production — real webhooks, real HTTPS, real
  scheduled jobs — without revealing anything early.
