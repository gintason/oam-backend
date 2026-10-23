from django.urls import path

from .views import (
    BankAccountsView,
    CancelWithdrawalView,
    ProcessQueueView,
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
    path("withdrawals/<uuid:withdrawal_id>/cancel/", CancelWithdrawalView.as_view(), name="payout-cancel"),
    path("queue/run/", ProcessQueueView.as_view(), name="payout-queue-run"),
    path("webhook/paystack/", WithdrawalWebhookView.as_view(), name="payout-webhook"),
]
