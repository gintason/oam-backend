import json
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.vtutrade.models import TradeOrder
from apps.vtutrade.services import TradeService
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService
from integrations.vtu.vtung.adapter import VtuNgAdapter

CFG = {"secret_key": "vtu_sk_test_dummy", "base_url": "https://api.vtu.ng/v1"}


def resp(status, body):
    return SimpleNamespace(status_code=status, content=b"x", json=lambda: body, text=json.dumps(body))


def txn(status, **extra):
    return {"data": {"reference": "VTU1", "status": {"value": status}, **extra}}


ON = dict(SECURE_SSL_REDIRECT=False, VTU_GIFTCARDS_ENABLED=True, VTU_RMB_ENABLED=True,
          GIFTCARD_BUY_MARKUP_PCT=2, GIFTCARD_SELL_MARGIN_PCT=1, RMB_MARKUP_PCT=0)


class Base(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="t@oam.test", password="x-Pass-12345", is_verified=True)
        self.wallet = WalletService.get_or_create_wallet(self.user, "NGN")
        WalletService.credit(self.wallet, Decimal("200000"), description="fund")
        self.api = APIClient(); self.api.force_authenticate(self.user)
        p = mock.patch("integrations.base.ProviderFactory.get", return_value=VtuNgAdapter(CFG)); p.start(); self.addCleanup(p.stop)
        p = mock.patch("apps.vtutrade.services.ProviderFactory.get", return_value=VtuNgAdapter(CFG)); p.start(); self.addCleanup(p.stop)
        p = mock.patch("integrations.vtu.vtung.v1.requests.request"); self.req = p.start(); self.addCleanup(p.stop)
        p = mock.patch("integrations.vtu.vtung.v1.requests.post"); self.post = p.start(); self.addCleanup(p.stop)

    def balance(self):
        return Wallet.objects.get(pk=self.wallet.pk).cached_balance


@override_settings(SECURE_SSL_REDIRECT=False)
class SwitchedOffTests(Base):
    def test_everything_off_by_default(self):
        self.assertEqual(self.api.get("/api/v1/trade/status/").json()["giftcards"], False)
        for url in ("/api/v1/trade/giftcards/buy/countries/", "/api/v1/trade/rmb/rates/"):
            self.assertEqual(self.api.get(url).status_code, 403)
        self.assertEqual(self.api.post("/api/v1/trade/giftcards/buy/", {}, format="json").status_code, 403)
        self.assertEqual(self.req.call_count, 0)


@override_settings(**ON)
class GiftCardBuyTests(Base):
    def test_buy_holds_then_captures_and_returns_codes(self):
        self.req.side_effect = [
            resp(200, {"data": {"total_price_ngn": "85000.00", "exact_unit_price_ngn": "85000.00"}}),   # calculate
            resp(201, {"transaction": {"reference": "GCB1", "status": {"value": "processing"}}}),     # buy
        ]
        r = self.api.post("/api/v1/trade/giftcards/buy/", {"product_id": 12, "amount": 50, "quantity": 1, "title": "Amazon US $50"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Decimal(r.json()["amount"]), Decimal("86700"))         # +2% markup
        self.assertEqual(self.balance(), Decimal("113300"))
        sent = self.req.call_args_list[1][1]
        self.assertEqual(sent["json"]["expected_amount_ngn"], "85000.00")
        o = TradeOrder.objects.get()
        self.req.side_effect = None
        self.req.return_value = resp(200, txn("completed", gift_card_codes=[{"code": "ABC-123", "pin": "999"}]))
        o = TradeService.refresh(o)
        self.assertEqual(o.status, "success")
        self.assertEqual(o.codes, [{"code": "ABC-123", "pin": "999"}])
        self.assertEqual(self.balance(), Decimal("113300"))
        self.assertEqual(o.revenue_amount, Decimal("1700"))

    def test_refunded_releases(self):
        self.req.side_effect = [resp(200, {"data": {"total_price_ngn": "10000"}}),
                                resp(201, {"transaction": {"reference": "GCB2", "status": {"value": "processing"}}})]
        self.api.post("/api/v1/trade/giftcards/buy/", {"product_id": 1, "amount": 10, "quantity": 1}, format="json")
        self.req.side_effect = None
        self.req.return_value = resp(200, txn("refunded"))
        o = TradeService.refresh(TradeOrder.objects.get())
        self.assertEqual(o.status, "failed")
        self.assertEqual(self.balance(), Decimal("200000"))

    def test_rejected_submission_refunds_immediately(self):
        self.req.side_effect = [resp(200, {"data": {"total_price_ngn": "10000"}}),
                                resp(422, {"error": {"code": "insufficient_funds", "message": "Insufficient"}})]
        r = self.api.post("/api/v1/trade/giftcards/buy/", {"product_id": 1, "amount": 10, "quantity": 1}, format="json")
        self.assertEqual(r.json()["status"], "failed")
        self.assertEqual(self.balance(), Decimal("200000"))


@override_settings(**ON)
class GiftCardSellTests(Base):
    def submit(self):
        self.req.return_value = resp(201, {"data": {"reference": "GCS1", "card_name": "Amazon", "card_amount": 100,
                                                    "card_currency": "USD", "payout_amount": {"raw": 125000}, "status": "pending"}})
        return self.api.post("/api/v1/trade/giftcards/sell/", {"slug": "amazon", "card_country": "US", "card_type": "ecode",
                                                              "card_currency": "USD", "card_amount": 100,
                                                              "additional_info": "AAAA-BBBB"}, format="json")

    def test_ecode_sell_credits_wallet_on_approval_minus_margin(self):
        r = self.submit()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["status"], "pending")
        self.assertEqual(Decimal(r.json()["amount"]), Decimal("123750"))        # 125000 - 1%
        self.assertNotIn("additional_info", TradeOrder.objects.get().details)    # code not stored
        self.assertEqual(self.balance(), Decimal("200000"))
        self.req.return_value = resp(200, txn("completed"))
        o = TradeService.refresh(TradeOrder.objects.get())
        self.assertEqual(o.status, "success")
        self.assertEqual(self.balance(), Decimal("323750"))
        TradeService.refresh(o); TradeService._succeed(o, {"status": "completed"})   # never twice
        self.assertEqual(self.balance(), Decimal("323750"))

    def test_declined_sell_changes_nothing(self):
        self.submit()
        self.req.return_value = resp(200, txn("cancelled", cancellation_reason="Code already used"))
        o = TradeService.refresh(TradeOrder.objects.get())
        self.assertEqual((o.status, o.failure_reason), ("cancelled", "Code already used"))
        self.assertEqual(self.balance(), Decimal("200000"))

    def test_physical_needs_image_and_is_sent_multipart(self):
        r = self.api.post("/api/v1/trade/giftcards/sell/", {"slug": "apple", "card_country": "US", "card_type": "physical",
                                                           "card_currency": "USD", "card_amount": 50}, format="multipart")
        self.assertEqual(r.status_code, 400)
        self.post.return_value = resp(201, {"data": {"reference": "GCS2", "payout_amount": {"raw": 50000}}})
        img = SimpleUploadedFile("card.jpg", b"\xff\xd8fake", content_type="image/jpeg")
        r = self.api.post("/api/v1/trade/giftcards/sell/", {"slug": "apple", "card_country": "US", "card_type": "physical",
                                                           "card_currency": "USD", "card_amount": 50, "images": img}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.post.call_args[1]["files"][0][0], "images[]")
        self.assertNotIn("Content-Type", self.post.call_args[1]["headers"])


@override_settings(**ON)
class RmbTests(Base):
    RATES = {"data": {"channels": [{"channel": "bank", "name": "Bank", "is_available": True, "account_types": [],
                                    "rates": [{"min_rmb": 100, "max_rmb": None, "ngn_per_rmb": 210}]}],
                      "limits": {"min_rmb": 100, "max_rmb": 50000, "currency": "CNY"}}}

    def test_bank_rmb_holds_and_refunds_on_failure(self):
        self.req.return_value = resp(200, self.RATES)
        self.post.return_value = resp(201, {"data": {"reference": "RMB1", "status": "processing",
                                                     "transaction": {"reference": "RMB1", "status": {"value": "processing"}}}})
        r = self.api.post("/api/v1/trade/rmb/buy/", {"channel": "bank", "rmb_amount": 500, "recipient_name": "Zhang Wei",
                                                    "recipient_bank_name": "ICBC", "recipient_bank_account_number": "6222"}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Decimal(r.json()["amount"]), Decimal("105000"))
        self.assertEqual(self.balance(), Decimal("95000"))
        self.req.return_value = resp(200, txn("failed", failure_reason="Recipient rejected"))
        o = TradeService.refresh(TradeOrder.objects.get())
        self.assertEqual(o.status, "failed")
        self.assertEqual(self.balance(), Decimal("200000"))

    def test_alipay_requires_qr_and_minimum(self):
        self.req.return_value = resp(200, self.RATES)
        r = self.api.post("/api/v1/trade/rmb/buy/", {"channel": "alipay", "alipay_account_type": "nigerian", "rmb_amount": 500,
                                                    "recipient_name": "Zhang"}, format="multipart")
        self.assertEqual(r.status_code, 400)
        r = self.api.post("/api/v1/trade/rmb/quote/", {"channel": "bank", "rmb_amount": 50}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.balance(), Decimal("200000"))
