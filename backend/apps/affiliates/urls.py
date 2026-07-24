from django.urls import path

from .views import (
    GiftcardLinkView,
    GiftcardProgramsView,
    HotelLinkView,
    HotelProgramsView,
    TravelLinkView,
    TravelProgramsView,
)

urlpatterns = [
    path("travel/", TravelProgramsView.as_view(), name="aff-travel-programs"),
    path("travel/<str:slug>/link/", TravelLinkView.as_view(), name="aff-travel-link"),
    path("giftcards/", GiftcardProgramsView.as_view(), name="aff-giftcard-programs"),
    path("giftcards/<str:slug>/link/", GiftcardLinkView.as_view(), name="aff-giftcard-link"),
    path("hotels/", HotelProgramsView.as_view(), name="aff-hotel-programs"),
    path("hotels/<str:slug>/link/", HotelLinkView.as_view(), name="aff-hotel-link"),
]
