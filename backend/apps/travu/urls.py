from django.urls import path

from .views import (BookingDetailView, BookingListView, BookView, CardVerifyView,
                    StatesView, TripSearchView)

urlpatterns = [
    path("states/", StatesView.as_view(), name="travu-states"),
    path("trips/", TripSearchView.as_view(), name="travu-trips"),
    path("book/", BookView.as_view(), name="travu-book"),
    path("card/verify/", CardVerifyView.as_view(), name="travu-card-verify"),
    path("bookings/", BookingListView.as_view(), name="travu-bookings"),
    path("bookings/<str:reference>/", BookingDetailView.as_view(), name="travu-booking-detail"),
]
