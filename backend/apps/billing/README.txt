OAM — Hardened VTU.ng delivery webhook
======================================
INSTALL
  cd /Users/mac/Desktop/oam-platform/backend
  unzip -o oam_vtung_webhook.zip -d apps/billing

  Then in apps/billing/urls.py, change the webhook import so it uses the new
  view instead of the one in views.py.

  Currently the file imports VtuNgWebhookView inside the multi-line
  "from .views import (...)" block. REMOVE it from that list, then add a
  separate line next to the .refresh import (near "urlpatterns"):

      from .webhook_vtung import VtuNgWebhookView

  The existing route needs NO change:
      path("webhook/vtung/", VtuNgWebhookView.as_view(), name="vtung-webhook"),

  Restart. No migration — nothing changed in the models.

  If you'd rather not touch the multi-line import, the alternative is to import
  it with an alias and use that in the path. Ask me and I'll send an exact diff
  rather than have you edit by hand — that import block has bitten us before.

WHY THE EXISTING WEBHOOK WOULD HAVE FAILED SILENTLY
  1. WRONG PAYLOAD DEPTH
     It reads request_id and status from the TOP LEVEL. VTU's requery nests the
     truth: data.status is stale, resolve.data.status is real, and the token is
     at resolve.data.meta_data.electricity_token. If the callback uses the same
     shape, the original settles nothing — no error, just a 200 and a customer
     still waiting for a token.

  2. THE EARLY-RETURN TRAP
     It calls apply_provider_status -> _apply, which returns early for orders
     already in a final state. Our own polling usually settles an order before
     the webhook lands, so a webhook CARRYING THE TOKEN would be discarded.
     That's precisely the bug that stranded your first three live purchases.

WHAT THIS VERSION DOES
  * Reads request_id / status / token from every shape VTU is known to use,
    resolved layer first
  * LOGS THE FULL PAYLOAD on arrival — the first real callback will tell us the
    actual shape instead of us guessing. Watch for "vtung webhook payload:" in
    your logs and send me the first one.
  * Always attempts token extraction, even on an already-settled order
  * Returns 200 for anything it can parse (webhooks that error get retried,
    then disabled by the provider)
  * Signature verification unchanged and still mandatory — this endpoint is
    public, so that check is all that stands between the internet and your
    order state

YOU CANNOT TEST THIS LOCALLY
  vtu.ng needs a public HTTPS URL; your backend is on 127.0.0.1:8080 and your
  macOS blocks ngrok. So: install it now, deploy, then activate.

AT DEPLOY TIME
  1. Confirm the endpoint is reachable:
        https://oam-app.com/api/v1/billing/webhook/vtung/
     A GET should return 405 (method not allowed) — that means it's routed and
     alive. A 404 means your production URL prefix differs.

  2. Email vtu.ng asking them to enable delivery callbacks for your account and
     to point them at that URL.

  3. Buy ₦1,000 of units and watch the log for "vtung webhook payload:". Send me
     that payload and I'll tighten the parsing to their exact shape.

KEEP THE POLLING
  Webhooks get missed — networks fail, deploys restart mid-delivery, providers
  drop callbacks. The refresh endpoint and settle_bill_orders sweeper stay as
  the safety net. Belt and braces is correct here: a missed token means a
  customer paid and got nothing.
