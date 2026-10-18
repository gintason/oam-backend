"""₦50 OAM service fee on cable TV and electricity (not airtime/data)."""
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.billing.card import CardCheckout, CardCheckoutService
from apps.billing.models import Biller, BillOrder, CustomerVerification
from apps.billing.services import BillingService
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService
from integrations.base.dto import TxnStatus


class FakeVTU:
    provider_key = "vtung"

    def __init__(self):
        self.requests = []

    def purchase(self, req):
        self.requests.append(req)
        return SimpleNamespace(status=TxnStatus.SUCCESS, provider_reference="P1",
                               raw={"data": {"amount_charged": str(req.amount)}})

    def list_variations(self, category, code):
        return [{"variation_id": "dstv-compact", "price": "19000", "reseller_price": ""}]


def _fake_init(user, amount, currency, callback_url=None, **kw):
    txn = SimpleNamespace(amount=Decimal(str(amount)), currency=currency, internal_reference=f"REF-{amount}")
    return txn, SimpleNamespace(authorization_url="https://checkout.example/pay")


@override_settings(SECURE_SSL_REDIRECT=False, BILL_SERVICE_FEES={"cable": 50, "electricity": 50})
class ServiceFeeTests(TestCase):
    def setUp(self):
        for cat, code in (("electricity", "ikeja-electric"), ("cable", "dstv"), ("airtime", "mtn"), ("betting", "bet9ja")):
            Biller.objects.create(country="NG", category=cat, code=code, name=code)
        self.user = get_user_model().objects.create_user(email="f@oam.test", password="x-Pass-12345", is_verified=True)
        self.wallet = WalletService.get_or_create_wallet(self.user, "NGN")
        WalletService.credit(self.wallet, Decimal("50000"), description="fund")
        self.vtu = FakeVTU()
        p = mock.patch("apps.billing.services.ProviderFactory.get", return_value=self.vtu)
        p.start(); self.addCleanup(p.stop)

    def balance(self):
        return Wallet.objects.get(pk=self.wallet.pk).cached_balance

    def verify(self, service_id, customer_id):
        return CustomerVerification.objects.create(user=self.user, service_id=service_id,
                                                   customer_id=customer_id, customer_name="TEST")

    def test_electricity_charges_amount_plus_50_and_sends_amount_to_provider(self):
        cv = self.verify("ikeja-electric", "45012345678")
        o = BillingService.purchase_electricity(user=self.user, country="NG", code="ikeja-electric",
                                                customer_id="45012345678", meter_type="prepaid",
                                                amount="1000", verification_id=str(cv.id))
        self.assertEqual(o.status, BillOrder.Status.SUCCESS)
        self.assertEqual(self.vtu.requests[0].amount, Decimal("1000"))          # meter gets ₦1,000 units
        self.assertEqual(o.amount, Decimal("1050"))
        self.assertEqual(self.balance(), Decimal("48950"))                       # wallet paid ₦1,050
        self.assertEqual(o.revenue_amount, Decimal("50"))
        self.assertEqual(o.metadata["fee"], "50")

    def test_cable_charges_package_plus_50(self):
        cv = self.verify("dstv", "7012345678")
        o = BillingService.purchase_cable(user=self.user, country="NG", code="dstv", customer_id="7012345678",
                                          variation_id="dstv-compact", verification_id=str(cv.id))
        self.assertEqual(self.vtu.requests[0].amount, Decimal("19000"))
        self.assertEqual(o.amount, Decimal("19050"))
        self.assertEqual(self.balance(), Decimal("30950"))
        self.assertEqual(o.revenue_amount, Decimal("50"))

    def test_airtime_has_no_fee(self):
        o = BillingService.purchase(user=self.user, country="NG", category="airtime", code="mtn",
                                    recipient="08031234567", amount=Decimal("500"))
        self.assertEqual(o.amount, Decimal("500"))
        self.assertEqual(self.vtu.requests[0].amount, Decimal("500"))
        self.assertEqual(self.balance(), Decimal("49500"))

    def test_betting_has_no_fee(self):
        cv = self.verify("bet9ja", "5648715")
        o = BillingService.purchase_betting(user=self.user, code="bet9ja", customer_id="5648715",
                                            amount="500", verification_id=str(cv.id))
        self.assertEqual(o.amount, Decimal("500"))
        self.assertEqual(self.vtu.requests[0].amount, Decimal("500"))
        self.assertEqual(self.balance(), Decimal("49500"))

    def test_failed_bill_refunds_amount_and_fee(self):
        self.vtu.purchase = lambda req: SimpleNamespace(status=TxnStatus.FAILED, provider_reference="", raw={})
        cv = self.verify("ikeja-electric", "45012345678")
        o = BillingService.purchase_electricity(user=self.user, country="NG", code="ikeja-electric",
                                                customer_id="45012345678", meter_type="prepaid",
                                                amount="1000", verification_id=str(cv.id))
        self.assertEqual(o.status, BillOrder.Status.FAILED)
        self.assertEqual(self.balance(), Decimal("50000"))

    @mock.patch("apps.billing.card.FundingService.initialize", side_effect=_fake_init)
    def test_card_adds_fee_for_bills_only(self, init):
        api = APIClient(); api.force_authenticate(self.user)
        url = "/api/v1/billing/purchase/card/"
        api.post(url, {"category": "electricity", "code": "ikeja-electric", "recipient": "45012345678",
                       "amount": "1000", "meter_type": "prepaid", "verification_id": "v"}, format="json")
        self.assertEqual(init.call_args[0][1], Decimal("1050"))
        api.post(url, {"category": "cable", "code": "dstv", "recipient": "7012345678",
                       "amount": "19000", "plan_code": "dstv-compact", "verification_id": "v"}, format="json")
        self.assertEqual(init.call_args[0][1], Decimal("19050"))
        api.post(url, {"category": "airtime", "code": "mtn", "recipient": "08031234567", "amount": "500"}, format="json")
        self.assertEqual(init.call_args[0][1], Decimal("500"))

    def test_card_delivery_buys_electricity_without_the_fee(self):
        c = CardCheckout(user=self.user, category="electricity", code="ikeja-electric", recipient="45012345678",
                         meter_type="prepaid", amount=Decimal("1050"), verification_id="v", currency="NGN")
        with mock.patch("apps.billing.card.BillingService.purchase_electricity") as pe:
            CardCheckoutService._purchase_for(c)
        self.assertEqual(pe.call_args.kwargs["amount"], Decimal("1000"))

    def test_billers_expose_service_fee(self):
        api = APIClient(); api.force_authenticate(self.user)
        r = api.get("/api/v1/billing/billers/", {"country": "NG"})
        self.assertEqual(r.status_code, 200, r.content)
        rows = r.json() if isinstance(r.json(), list) else r.json().get("results", [])
        fees = {b["category"]: b["service_fee"] for b in rows}
        self.assertEqual((fees["electricity"], fees["cable"], fees["airtime"]), ("50", "50", "0"))
