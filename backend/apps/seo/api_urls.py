from django.urls import path

from . import public_api as v

urlpatterns = [
    path("listings/", v.PublicListingSearchView.as_view(), name="public-listings"),
    path("listings/<uuid:listing_id>/", v.PublicListingDetailView.as_view(), name="public-listing"),
    path("artisans/", v.PublicArtisanSearchView.as_view(), name="public-artisans"),
    path("artisans/<uuid:artisan_id>/", v.PublicArtisanDetailView.as_view(), name="public-artisan"),
]
