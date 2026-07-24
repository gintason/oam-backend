from django.urls import path

from .views import (
    BankAccountsView,
    BankListView,
    ResolveAccountView,
    WithdrawalListView,
    WithdrawalWebhookView,
    WithdrawView,
)

urlpatterns = [
    path("banks-list/", BankListView.as_view(), name="payout-bank-list"),
    path("resolve-account/", ResolveAccountView.as_view(), name="payout-resolve"),
    path("banks/", BankAccountsView.as_view(), name="payout-banks"),
    path("withdrawals/", WithdrawView.as_view(), name="payout-withdraw"),
    path("withdrawals/history/", WithdrawalListView.as_view(), name="payout-history"),
    path("webhook/paystack/", WithdrawalWebhookView.as_view(), name="payout-webhook"),
]
