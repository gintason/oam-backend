from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.billing.card import CardCheckout
from apps.billing.models import Biller

URL = "/api/v1/billing/purchase/card/"


def _fake_init(user, amount, currency, callback_url=None, **kw):
    txn = SimpleNamespace(amount=Decimal(str(amount)), currency=currency, internal_reference=f"REF-{amount}")
    return txn, SimpleNamespace(authorization_url="https://checkout.example/pay")


@override_settings(SECURE_SSL_REDIRECT=False)
class BettingCardCheckoutTests(TestCase):
    def setUp(self):
        Biller.objects.create(country="NG", category="betting", code="bet9ja", name="Bet9ja")
        Biller.objects.create(country="NG", category="airtime", code="mtn", name="MTN")
        u = get_user_model().objects.create_user(email="b@oam.test", password="x-Pass-12345", is_verified=True)
        self.api = APIClient()
        self.api.force_authenticate(u)

    @mock.patch("apps.billing.card.FundingService.initialize", side_effect=_fake_init)
    def test_betting_card_payment_starts_for_amount_plus_fee(self, init):
        r = self.api.post(URL, {"category": "betting", "code": "bet9ja", "recipient": "5648715",
                                "amount": "250", "verification_id": "v-1"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["authorization_url"], "https://checkout.example/pay")
        c = CardCheckout.objects.get()
        self.assertEqual((c.category, c.amount, c.verification_id), ("betting", Decimal("250"), "v-1"))
        self.assertEqual(init.call_args[0][1], Decimal("250"))   # card charged credit + ₦50 fee

    @mock.patch("apps.billing.card.FundingService.initialize", side_effect=_fake_init)
    def test_betting_card_must_exceed_fee(self, init):
        r = self.api.post(URL, {"category": "betting", "code": "bet9ja", "recipient": "5648715", "amount": "50"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("service fee", str(r.json()["amount"]))
        init.assert_not_called()

    @mock.patch("apps.billing.card.FundingService.initialize", side_effect=_fake_init)
    def test_other_categories_still_work(self, init):
        r = self.api.post(URL, {"category": "airtime", "code": "mtn", "recipient": "08031234567", "amount": "50"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)

    def test_delivery_credits_amount_minus_fee(self):
        from apps.billing.card import CardCheckoutService
        c = CardCheckout(user=get_user_model().objects.get(email="b@oam.test"), category="betting", code="bet9ja",
                         recipient="5648715", amount=Decimal("250"), verification_id="v-1", currency="NGN")
        with mock.patch("apps.billing.card.BillingService.purchase_betting") as pb:
            CardCheckoutService._purchase_for(c)
        self.assertEqual(pb.call_args.kwargs["amount"], Decimal("200"))
