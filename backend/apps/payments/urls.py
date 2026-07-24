from django.urls import path

from .views import (
    DevSimulateSuccessView,
    FundInitView,
    FundVerifyView,
    PaystackWebhookView,
)

urlpatterns = [
    path("fund/", FundInitView.as_view(), name="fund-init"),
    path("fund/verify/<str:reference>/", FundVerifyView.as_view(), name="fund-verify"),
    path("webhook/paystack/", PaystackWebhookView.as_view(), name="paystack-webhook"),
    path("dev/simulate-success/", DevSimulateSuccessView.as_view(), name="dev-simulate-success"),
]
