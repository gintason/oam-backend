from django.urls import path

from .views import DefaultCurrencyView, WalletListView, WalletTransactionsView
from .transfer import ResolveRecipientView, SendTransferView, TransferHistoryView

urlpatterns = [
    path("", WalletListView.as_view(), name="wallet-list"),
    path("default-currency/", DefaultCurrencyView.as_view(), name="wallet-default-currency"),
    path("transfer/resolve/", ResolveRecipientView.as_view(), name="wallet-transfer-resolve"),
    path("transfer/", SendTransferView.as_view(), name="wallet-transfer"),
    path("transfers/", TransferHistoryView.as_view(), name="wallet-transfers"),
    path("<str:currency>/transactions/", WalletTransactionsView.as_view(), name="wallet-transactions"),
]