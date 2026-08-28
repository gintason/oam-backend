from django.urls import path
from .card import CardPurchaseStartView, CardPurchaseStatusView
from .views import (
    BettingFundView,
    BillerListView,
    DataPlansView,
    TvPlansView,
    VerifyCustomerView,
    RevenueSweepView,
    RevenueView,
    OrderDetailView,
    OrderListView,
    OrderRequeryView,
    PurchaseView,
    VtuNgWebhookView,
)
from .card_return import CardPurchaseReturnView 
from .refresh import OrderRefreshView, OrdersRefreshAllView

urlpatterns = [
    path("billers/", BillerListView.as_view(), name="biller-list"),
    path("data-plans/", DataPlansView.as_view(), name="data-plans"),
    path("tv-plans/", TvPlansView.as_view(), name="tv-plans"),
    path("verify-customer/", VerifyCustomerView.as_view(), name="verify-customer"),
    path("betting/fund/", BettingFundView.as_view(), name="betting-fund"),
    path("purchase/", PurchaseView.as_view(), name="bill-purchase"),
    path("orders/", OrderListView.as_view(), name="bill-orders"),
    path("orders/refresh/", OrdersRefreshAllView.as_view(), name="orders-refresh-all"),
    path("orders/<str:reference>/refresh/", OrderRefreshView.as_view(), name="order-refresh"),
    path("orders/<str:reference>/", OrderDetailView.as_view(), name="bill-order-detail"),
    path("orders/<str:reference>/requery/", OrderRequeryView.as_view(), name="bill-order-requery"),
    path("webhook/vtung/", VtuNgWebhookView.as_view(), name="vtung-webhook"),
    path("revenue/", RevenueView.as_view(), name="bill-revenue"),
    path("revenue/sweep/", RevenueSweepView.as_view(), name="bill-revenue-sweep"),
    path("purchase/card/", CardPurchaseStartView.as_view(), name="bill-card-start"),
    path("purchase/card/<str:reference>/", CardPurchaseStatusView.as_view(), name="bill-card-status"),
    path("purchase/card/", CardPurchaseStartView.as_view(), name="bill-card-start"),
    path("purchase/card/return/", CardPurchaseReturnView.as_view(), name="bill-card-return"),   # ← ADD
    path("purchase/card/<str:reference>/", CardPurchaseStatusView.as_view(), name="bill-card-status"),
]
