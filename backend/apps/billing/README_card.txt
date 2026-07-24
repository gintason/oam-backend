OAM — BACKEND: card.py (pay for services directly with a card)
==============================================================
UNZIP FROM: /Users/mac/Desktop/oam-platform/backend/apps/billing

  cd /Users/mac/Desktop/oam-platform/backend/apps/billing
  unzip -o oam_card_backend.zip

That drops card.py right beside models.py / urls.py / services.py.

THEN 2 SMALL EDITS
------------------
(a) apps/billing/models.py — add at the very BOTTOM of the file:

      from .card import CardCheckout  # noqa: F401

(b) apps/billing/urls.py — add the import near the top:

      from .card import CardPurchaseStartView, CardPurchaseStatusView

    and add these 2 lines inside urlpatterns = [ ... ]:

      path("purchase/card/", CardPurchaseStartView.as_view(), name="bill-card-start"),
      path("purchase/card/<str:reference>/", CardPurchaseStatusView.as_view(), name="bill-card-status"),

THEN MIGRATE + RESTART
----------------------
  cd /Users/mac/Desktop/oam-platform/backend
  source venv/bin/activate          (or however you activate it)
  python manage.py makemigrations billing
  python manage.py migrate
  python manage.py check
  python manage.py runserver 8080

REMINDER: live Paystack keys go in the BACKEND .env only:
  PAYSTACK_SECRET_KEY=sk_live_xxx
  PAYSTACK_PUBLIC_KEY=pk_live_xxx
And unset any leaked shell vars first (the recurring gotcha):
  unset PAYSTACK_SECRET_KEY PAYSTACK_PUBLIC_KEY
