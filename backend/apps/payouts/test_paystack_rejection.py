"""A transfer Paystack rejects: customer-side problems fail cleanly (wallet
restored, reason shown); OAM-side problems (empty balance) are queued."""
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.payouts.models import BankAccount, WithdrawalOrder
from apps.payouts.services import WithdrawalService
from apps.wallet.models import Wallet
from apps.wallet.services import WalletService
from integrations.base.exceptions import ProviderValidationError
from integrations.payouts.paystack.adapter import PaystackPayouts


def _rejecting(message):
    adapter = PaystackPayouts(config={"secret_key": "sk_test_x"})
    error = ProviderValidationError("paystack", "rejected (400)",
                                    raw={"status": False, "message": message})
    adapter.post = mock.Mock(side_effect=error)
    return adapter


class PaystackRejectionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="w@test.test", password="x", is_verified=True)
        self.wallet = WalletService.get_or_create_wallet(self.user, "NGN")
        WalletService.credit(self.wallet, Decimal("47664.38"), description="test funding")
        self.bank = BankAccount.objects.create(user=self.user, bank_code="058", bank_name="GTBank",
                                               account_number="0060585887", account_name="CHIDIMMA OKAFOR",
                                               recipient_code="RCP_test")

    def _withdraw(self, message):
        with mock.patch("apps.payouts.services.ProviderFactory.get", return_value=_rejecting(message)):
            return WithdrawalService.withdraw(user=self.user, bank_account=self.bank, amount=Decimal("1000"))

    def balance(self):
        return Wallet.objects.get(pk=self.wallet.pk).cached_balance

    def test_empty_paystack_balance_queues_instead_of_failing(self):
        # OAM's side of the gateway: keep the money reserved and retry after a top-up.
        order = self._withdraw("Your balance is not enough to fulfil this request")
        self.assertEqual(order.status, WithdrawalOrder.Status.QUEUED)
        self.assertEqual(self.balance(), Decimal("47664.38") - Decimal("1025"))   # still held (amount + fee)
        self.assertEqual(order.failure_reason, "")
        self.assertIn("balance is not enough", str(order.response_payload))  # real reason for staff

    def test_other_rejections_keep_their_reason(self):
        order = self._withdraw("Invalid recipient")
        self.assertEqual(order.status, WithdrawalOrder.Status.FAILED)
        self.assertEqual(self.balance(), Decimal("47664.38"))
        self.assertEqual(order.failure_reason, "Transfer failed: Invalid recipient")
