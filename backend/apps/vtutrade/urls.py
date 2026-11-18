from django.urls import path

from . import views as v

urlpatterns = [
    path("status/", v.StatusView.as_view()),
    path("giftcards/buy/countries/", v.BuyCountriesView.as_view()),
    path("giftcards/buy/products/", v.BuyProductsView.as_view()),
    path("giftcards/buy/quote/", v.BuyQuoteView.as_view()),
    path("giftcards/buy/", v.BuyView.as_view()),
    path("giftcards/sell/catalog/", v.SellCatalogView.as_view()),
    path("giftcards/sell/rates/", v.SellRatesView.as_view()),
    path("giftcards/sell/", v.SellView.as_view()),
    path("rmb/rates/", v.RmbRatesView.as_view()),
    path("rmb/quote/", v.RmbQuoteView.as_view()),
    path("rmb/buy/", v.RmbBuyView.as_view()),
    path("orders/", v.OrderListView.as_view()),
    path("orders/<str:reference>/", v.OrderDetailView.as_view()),
]
