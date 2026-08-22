from django.urls import path

from .views import (
    CategoryListView,
    ListingCreateView,
    ListingDetailView,
    ListingListView,
    ListingRenewView,
    ListingVerifyView,
    MyListingsView,
    SubscribeView,
    SubscriptionVerifyView,
    SubscriptionView,
    SubscriptionWebhookView,
)

from .motors import MotorsDetailView, MotorsInventoryView

from .public_listings import PublicCategoriesView, PublicListingsView

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="mkt-categories"),
    path("motors/", MotorsInventoryView.as_view(), name="mkt-motors"),
    path("motors/<uuid:listing_id>/", MotorsDetailView.as_view(), name="mkt-motors-detail"),
    path("public/listings/", PublicListingsView.as_view(), name="mkt-public-listings"),
    path("public/categories/", PublicCategoriesView.as_view(), name="mkt-public-categories"),
    path("listings/", ListingListView.as_view(), name="mkt-listings"),
    path("listings/create/", ListingCreateView.as_view(), name="mkt-listing-create"),
    path("listings/<uuid:listing_id>/", ListingDetailView.as_view(), name="mkt-listing-detail"),
    path("listings/<uuid:listing_id>/renew/", ListingRenewView.as_view(), name="mkt-listing-renew"),
    path("listings/<uuid:listing_id>/verify/", ListingVerifyView.as_view(), name="mkt-listing-verify"),
    path("my-listings/", MyListingsView.as_view(), name="mkt-my-listings"),
    path("subscription/", SubscriptionView.as_view(), name="mkt-subscription"),
    path("subscription/subscribe/", SubscribeView.as_view(), name="mkt-subscribe"),
    path("subscription/verify/", SubscriptionVerifyView.as_view(), name="mkt-subscribe-verify"),
    path("subscription/webhook/paystack/", SubscriptionWebhookView.as_view(), name="mkt-subscribe-webhook"),
    path("subscription/webhook/flutterwave/", SubscriptionWebhookView.as_view(), name="mkt-subscribe-webhook-flw"),
]
