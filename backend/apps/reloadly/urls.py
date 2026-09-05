from django.urls import path

from .views import (BuyView, CardVerifyView, CountriesView, OperatorsView,
                    QuoteView, TopupDetailView, TopupListView)

urlpatterns = [
    path("countries/", CountriesView.as_view(), name="reloadly-countries"),
    path("operators/", OperatorsView.as_view(), name="reloadly-operators"),
    path("quote/", QuoteView.as_view(), name="reloadly-quote"),
    path("buy/", BuyView.as_view(), name="reloadly-buy"),
    path("card/verify/", CardVerifyView.as_view(), name="reloadly-card-verify"),
    path("topups/", TopupListView.as_view(), name="reloadly-topups"),
    path("topups/<str:reference>/", TopupDetailView.as_view(), name="reloadly-topup-detail"),
]
