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

from .verification_views import (
    AttachDocumentView,
    MyVerificationView,
    RemoveServiceImageView,
    ReviewDecisionView,
    ReviewDetailView,
    ReviewQueueView,
    SubmitVerificationView,
)

from .featured import FeaturedArtisansView, ServiceCategoriesPublicView

urlpatterns = [
    path("categories/", ServiceCategoryListView.as_view(), name="hs-categories"),
    path("artisans/", ArtisanSearchView.as_view(), name="hs-search"),
    path("artisans/register/", ArtisanRegisterView.as_view(), name="hs-register"),
    path("artisans/me/", MyArtisanView.as_view(), name="hs-me"),
    path("artisans/boost/", BoostInitView.as_view(), name="hs-boost"),
    path("artisans/boost/verify/", BoostVerifyView.as_view(), name="hs-boost-verify"),
    path("artisans/boost/webhook/paystack/", BoostWebhookView.as_view(), name="hs-boost-webhook"),
    path("artisans/verification/", MyVerificationView.as_view(), name="hs-verification"),
    path("artisans/verification/attach/", AttachDocumentView.as_view(), name="hs-verif-attach"),
    path("artisans/verification/submit/", SubmitVerificationView.as_view(), name="hs-verif-submit"),
    path("artisans/verification/images/<uuid:image_id>/", RemoveServiceImageView.as_view(), name="hs-verif-image"),
    path("artisans/verification/queue/", ReviewQueueView.as_view(), name="hs-verif-queue"),
    path("artisans/verification/queue/<uuid:verification_id>/", ReviewDetailView.as_view(), name="hs-verif-detail"),
    path("artisans/verification/queue/<uuid:verification_id>/<str:decision>/", ReviewDecisionView.as_view(), name="hs-verif-decision"),
    path("featured/", FeaturedArtisansView.as_view(), name="hs-featured"),
    path("categories/public/", ServiceCategoriesPublicView.as_view(), name="hs-categories-public"),
    path("artisans/<uuid:artisan_id>/", ArtisanDetailView.as_view(), name="hs-detail"),
]
