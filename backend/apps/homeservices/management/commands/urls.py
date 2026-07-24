from django.urls import path

from .views import (
    ArtisanDetailView,
    ArtisanRegisterView,
    ArtisanSearchView,
    BoostInitView,
    BoostVerifyView,
    BoostWebhookView,
    MyArtisanView,
    ServiceCategoryListView,
)

urlpatterns = [
    path("categories/", ServiceCategoryListView.as_view(), name="hs-categories"),
    path("artisans/", ArtisanSearchView.as_view(), name="hs-search"),
    path("artisans/register/", ArtisanRegisterView.as_view(), name="hs-register"),
    path("artisans/me/", MyArtisanView.as_view(), name="hs-me"),
    path("artisans/boost/", BoostInitView.as_view(), name="hs-boost"),
    path("artisans/boost/verify/", BoostVerifyView.as_view(), name="hs-boost-verify"),
    path("artisans/boost/webhook/paystack/", BoostWebhookView.as_view(), name="hs-boost-webhook"),
    path("artisans/<uuid:artisan_id>/", ArtisanDetailView.as_view(), name="hs-detail"),
]
