"""Customer deposits stay in the main Paystack balance (withdrawals are paid from it);
only pure OAM income settles to the revenue subaccount."""
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.payments.services import FundingService, revenue_split
from integrations.base.dto import ChargeInit

SUB = "ACCT_revenue_test"


def _gateway(key):
    g = mock.Mock()
    g.provider_key = key
    g.initialize_charge.return_value = ChargeInit(authorization_url="https://pay.test/x",
                                                  access_code="ac", provider_reference="ref")
    return g


@override_settings(PAYSTACK_DEPOSIT_SUBACCOUNT_CODE=SUB, PAYSTACK_REVENUE_SUBACCOUNT_CODE=SUB)
class MoneyRoutingTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="m@test.test", password="x", is_verified=True)

    def test_wallet_deposit_stays_in_main_balance(self):
        g = _gateway("paystack")
        with mock.patch("apps.payments.services.ProviderFactory.get", return_value=g):
            FundingService.initialize(self.user, Decimal("40000"), "NGN")
        kw = g.initialize_charge.call_args.kwargs
        self.assertFalse(kw.get("subaccount"))           # nothing routed away from Paystack
        self.assertEqual(kw["amount"], Decimal("40000"))  # customer pays exactly what they typed

    def test_marketplace_upgrade_on_paystack_goes_to_revenue_subaccount(self):
        from apps.marketplace.services import MarketplaceService
        g = _gateway("paystack")
        with override_settings(LISTING_UPGRADE_PROVIDER="paystack"), \
                mock.patch("apps.marketplace.services.ProviderFactory.get", return_value=g):
            MarketplaceService.initiate_subscription(user=self.user, tier="premium")
        kw = g.initialize_charge.call_args.kwargs
        self.assertEqual(kw["subaccount"], SUB)
        self.assertEqual(kw["transaction_charge"], 0)
        self.assertEqual(kw["bearer"], "subaccount")

    def test_other_gateways_get_no_split(self):
        self.assertEqual(revenue_split(_gateway("flutterwave")), {})
        self.assertEqual(revenue_split(_gateway("mock")), {})

    @override_settings(PAYSTACK_REVENUE_SUBACCOUNT_CODE="")
    def test_no_revenue_subaccount_configured(self):
        self.assertEqual(revenue_split(_gateway("paystack")), {})
