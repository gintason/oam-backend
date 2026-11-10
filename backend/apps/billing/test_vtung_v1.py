"""VTU.ng Partner API v1 adapter — HTTP is mocked; no real calls, no real key."""
import json
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.billing.models import Biller, BillOrder, CustomerVerification
from apps.billing.services import BillingService
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService
from integrations.base.dto import TxnStatus
from integrations.base.exceptions import ProviderError
from integrations.vtu.vtung.adapter import VtuNgAdapter

CFG = {"secret_key": "vtu_sk_test_dummy", "base_url": "https://api.vtu.ng/v1"}


def resp(status, body):
    return SimpleNamespace(status_code=status, content=b"x", json=lambda: body, text=json.dumps(body))


def txn(status="processing", ref="BILL202611100001", **meta):
    return {"message": "ok", "transaction": {
        "reference": ref, "status": {"value": status, "is_final": status != "processing"},
        "amount": {"raw": 100}, "metadata": meta, "failure_reason": None}}


class AdapterTests(TestCase):
    def setUp(self):
        self.a = VtuNgAdapter(CFG)
        p = mock.patch("integrations.vtu.vtung.v1.requests.request")
        self.req = p.start(); self.addCleanup(p.stop)

    def call(self, i=-1):
        args, kw = self.req.call_args_list[i]
        return args[0], args[1], kw

    def test_legacy_used_without_secret_key(self):
        self.assertIsNone(VtuNgAdapter({"username": "u", "password": "p"}).v1)
        self.assertIsNotNone(self.a.v1)

    def test_airtime_maps_9mobile_and_sends_idempotency_key(self):
        self.req.return_value = resp(201, txn())
        r = self.a.purchase(SimpleNamespace(service="airtime", operator="9MOBILE", recipient="0809",
                                            amount=Decimal("100"), plan_code="", request_id="BILL-OURREF"))
        method, url, kw = self.call()
        self.assertEqual((method, url), ("POST", "https://api.vtu.ng/v1/bills/airtime"))
        self.assertEqual(kw["json"], {"phone": "0809", "network": "t2mobile", "amount": 100})
        self.assertEqual(kw["headers"]["Idempotency-Key"], "BILL-OURREF")
        self.assertEqual(kw["headers"]["Authorization"], "Bearer vtu_sk_test_dummy")
        self.assertEqual((r.status, r.provider_reference), (TxnStatus.PENDING, "BILL202611100001"))

    def test_status_mapping(self):
        rq = SimpleNamespace(service="airtime", operator="MTN", recipient="1", amount=50, plan_code="", request_id="R")
        for code, body, want in [
            (201, txn("completed"), TxnStatus.SUCCESS),
            (201, txn("refunded"), TxnStatus.FAILED),
            (422, {"error": {"code": "insufficient_funds"}}, TxnStatus.FAILED),
            (409, {"error": {"code": "idempotency_request_in_progress"}}, TxnStatus.PENDING),
            (502, {}, TxnStatus.PENDING),
            (401, {"error": {"code": "authentication_failed"}}, TxnStatus.FAILED),
        ]:
            self.req.return_value = resp(code, body)
            self.assertEqual(self.a.purchase(rq).status, want, (code, body))

    def test_electricity_payload_and_token_in_legacy_shape(self):
        self.req.return_value = resp(201, txn("completed", customer_name="JOHN", electricity_token="1234-5678",
                                              electricity_units="12.5"))
        r = self.a.purchase(SimpleNamespace(service="electricity", operator="ikeja-electric", recipient="4501",
                                            amount=Decimal("1000"), plan_code="prepaid", request_id="R2"))
        self.assertEqual(self.call()[2]["json"], {"disco_slug": "ikedc", "meter_number": "4501",
                                                  "meter_type": "prepaid", "amount": 1000})
        self.assertEqual(r.raw["data"]["token"], "1234-5678")
        self.assertEqual(r.raw["data"]["units"], "12.5")
        self.assertEqual(r.raw["data"]["customer_name"], "JOHN")

    def test_betting_and_cable_payloads(self):
        self.req.return_value = resp(201, txn())
        self.a.purchase(SimpleNamespace(service="betting", operator="LiveScoreBet", recipient="123",
                                        amount=Decimal("500"), plan_code="", request_id="R3"))
        self.assertEqual(self.call()[2]["json"], {"provider": "livescorebet", "account_id": "123", "amount": 500})
        self.a.purchase(SimpleNamespace(service="cable", operator="dstv", recipient="7012", amount=0,
                                        plan_code="dstv-compact", request_id="R4"))
        self.assertEqual(self.call()[2]["json"], {"provider": "dstv", "smartcard_number": "7012",
                                                  "subscription_type": "change", "variation_code": "dstv-compact"})
        n = self.req.call_count
        r = self.a.purchase(SimpleNamespace(service="cable", operator="showmax", recipient="1", amount=0,
                                            plan_code="x", request_id="R5"))
        self.assertEqual(r.status, TxnStatus.FAILED)
        self.assertEqual(self.req.call_count, n)                    # nothing sent

    def test_requery_by_our_reference(self):
        self.req.return_value = resp(200, {"data": txn("completed")["transaction"]})
        s = self.a.get_status("BILL-OURREF")
        method, url, kw = self.call()
        self.assertEqual(url, "https://api.vtu.ng/v1/transactions/BILL-OURREF")
        self.assertEqual(kw["params"], {"type": "bill_payment"})
        self.assertEqual(s.status, TxnStatus.SUCCESS)
        self.req.return_value = resp(404, {"error": {"code": "not_found"}})
        with self.assertRaises(ProviderError):
            self.a.get_status("BILL-UNKNOWN")

    def test_data_plans_and_verify(self):
        self.req.return_value = resp(200, {"data": [{"variation_code": "mtn-1gb", "name": "MTN 1GB", "amount": 500}]})
        self.assertEqual(self.a.list_variations("data", "MTN"),
                         [{"variation_id": "mtn-1gb", "name": "MTN 1GB", "price": "500",
                           "reseller_price": "", "validity": ""}])
        self.assertEqual(self.call()[2]["params"], {"network": "mtn"})
        self.req.return_value = resp(200, {"verification": {"customer_name": "ENGR JOHN",
                                                            "minimum_purchase_amount": 500}})
        d = self.a.verify_customer("ikeja-electric", "4501", "prepaid")
        self.assertEqual((d["customer_name"], d["min_purchase_amount"]), ("ENGR JOHN", 500))
        self.assertEqual(self.call()[2]["json"]["disco_slug"], "ikedc")
        self.req.return_value = resp(200, {"validation": {"name": "BETTOR", "min_payable_amount": 100}})
        self.assertEqual(self.a.verify_customer("Bet9ja", "123")["customer_name"], "BETTOR")
        self.req.return_value = resp(422, {"error": {"code": "smartcard_not_found", "message": "Not recognised"}})
        with self.assertRaises(ProviderError):
            self.a.verify_customer("dstv", "000")


@override_settings(SECURE_SSL_REDIRECT=False)
class BillingFlowV1Tests(TestCase):
    """Real BillingService + real adapter, only HTTP mocked."""

    def setUp(self):
        Biller.objects.create(country="NG", category="electricity", code="ikeja-electric", name="IKEDC")
        Biller.objects.create(country="NG", category="airtime", code="MTN", name="MTN")
        self.user = get_user_model().objects.create_user(email="v1@oam.test", password="x-Pass-12345", is_verified=True)
        self.wallet = WalletService.get_or_create_wallet(self.user, "NGN")
        WalletService.credit(self.wallet, Decimal("5000"), description="fund")
        adapter = VtuNgAdapter(CFG)
        for target in ("apps.billing.services.ProviderFactory.get", "apps.billing.webhook_vtung.ProviderFactory.get"):
            p = mock.patch(target, return_value=adapter); p.start(); self.addCleanup(p.stop)
        p = mock.patch("integrations.vtu.vtung.v1.requests.request")
        self.req = p.start(); self.addCleanup(p.stop)

    def balance(self):
        return Wallet.objects.get(pk=self.wallet.pk).cached_balance

    def test_processing_then_webhook_requery_completes_and_collects_token(self):
        cv = CustomerVerification.objects.create(user=self.user, service_id="ikeja-electric",
                                                 customer_id="4501", customer_name="JOHN")
        self.req.return_value = resp(201, txn("processing", ref="BILLV1A"))
        o = BillingService.purchase_electricity(user=self.user, country="NG", code="ikeja-electric",
                                                customer_id="4501", meter_type="prepaid", amount="1000",
                                                verification_id=str(cv.id))
        self.assertEqual(o.status, BillOrder.Status.PROCESSING)
        self.assertEqual(o.provider_reference, "BILLV1A")
        # VTU webhook arrives; we ignore its content and requery by our reference.
        self.req.return_value = resp(200, {"data": txn("completed", ref="BILLV1A",
                                                       electricity_token="1111-2222", electricity_units="9")["transaction"]})
        body = {"event": "transaction.completed", "data": {"reference": "BILLV1A", "status": "completed"}}
        r = APIClient().post("/api/v1/billing/webhook/vtung/", body, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        o.refresh_from_db()
        self.assertEqual(o.status, BillOrder.Status.SUCCESS)
        self.assertEqual(o.token, "1111-2222")
        self.assertIn(f"/transactions/{o.reference}", self.req.call_args_list[-1][0][1])

    def test_refunded_releases_wallet(self):
        self.req.return_value = resp(201, txn("refunded"))
        before = self.balance()
        o = BillingService.purchase(user=self.user, country="NG", category="airtime", code="MTN",
                                    recipient="0803", amount="100")
        self.assertEqual(o.status, BillOrder.Status.FAILED)
        self.assertEqual(self.balance(), before)

    def test_unknown_webhook_reference_ignored(self):
        r = APIClient().post("/api/v1/billing/webhook/vtung/",
                             {"event": "transaction.completed", "data": {"reference": "NOPE"}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.req.call_count, 0)


class BaseUrlGuardTests(TestCase):
    def test_legacy_wp_json_base_is_ignored(self):
        from integrations.vtu.vtung.v1 import VtuNgV1
        self.assertEqual(VtuNgV1({"secret_key": "k", "base_url": "https://vtu.ng/wp-json"}).base,
                         "https://api.vtu.ng/v1")
        self.assertEqual(VtuNgV1({"secret_key": "k", "base_url": "https://sandbox.vtu.ng/v1"}).base,
                         "https://sandbox.vtu.ng/v1")
