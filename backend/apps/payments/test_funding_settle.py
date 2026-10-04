"""
    python manage.py test apps.payments
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.payments.models import ServiceTransaction
from apps.payments.services import FundingService
from apps.wallet.services import WalletService
from integrations.base.dto import TxnStatus


class FundingSettleAmountTests(TestCase):
    """Paystack reports kobo; a ₦500 deposit with fees passed on shows amount=50762."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(email="q@test.test", password="x", is_verified=True)

    def txn(self, ref, provider="paystack", amount="500"):
        return ServiceTransaction.objects.create(
            user=self.user, service_type=ServiceTransaction.Service.WALLET_FUND, provider=provider,
            status=ServiceTransaction.Status.PROCESSING, amount=Decimal(amount), currency="NGN",
            internal_reference=ref)

    def balance(self):
        w = WalletService.get_or_create_wallet(self.user, "NGN")
        w.refresh_from_db()
        return w.cached_balance

    def test_paystack_kobo_with_customer_fees_credits_deposit(self):
        self.txn("FUND-a")
        raw = {"data": {"status": "success", "amount": 50762, "requested_amount": 50000, "currency": "NGN"}}
        t = FundingService.settle("FUND-a", verified_status=TxnStatus.SUCCESS, raw=raw)
        self.assertEqual(t.status, ServiceTransaction.Status.SUCCESS)
        self.assertEqual(self.balance(), Decimal("500"))
        FundingService.settle("FUND-a", verified_status=TxnStatus.SUCCESS, raw=raw)   # idempotent
        self.assertEqual(self.balance(), Decimal("500"))

    def test_paystack_webhook_payload_without_requested_amount(self):
        self.txn("FUND-b")
        raw = {"status": "success", "amount": 50000, "currency": "NGN"}   # webhook passes data directly
        t = FundingService.settle("FUND-b", verified_status=TxnStatus.SUCCESS, raw=raw)
        self.assertEqual(t.status, ServiceTransaction.Status.SUCCESS)

    def test_underpayment_is_refused(self):
        self.txn("FUND-c")
        raw = {"data": {"status": "success", "amount": 40000, "currency": "NGN"}}   # ₦400 for ₦500
        t = FundingService.settle("FUND-c", verified_status=TxnStatus.SUCCESS, raw=raw)
        self.assertEqual(t.status, ServiceTransaction.Status.PROCESSING)
        self.assertEqual(self.balance(), Decimal("0"))

    def test_flutterwave_major_units(self):
        self.txn("FUND-d", provider="flutterwave")
        raw = {"data": {"status": "successful", "amount": 500, "charged_amount": 507, "currency": "NGN"}}
        t = FundingService.settle("FUND-d", verified_status=TxnStatus.SUCCESS, raw=raw)
        self.assertEqual(t.status, ServiceTransaction.Status.SUCCESS)
        self.assertEqual(self.balance(), Decimal("500"))

    def test_currency_mismatch_refused(self):
        self.txn("FUND-e")
        raw = {"data": {"status": "success", "amount": 50000, "currency": "USD"}}
        t = FundingService.settle("FUND-e", verified_status=TxnStatus.SUCCESS, raw=raw)
        self.assertEqual(t.status, ServiceTransaction.Status.PROCESSING)
