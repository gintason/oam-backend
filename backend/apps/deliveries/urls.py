from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("requests", views.DeliveryRequestViewSet, basename="delivery-request")
router.register("admin/riders", views.AdminRiderViewSet, basename="delivery-admin-rider")
router.register("admin/deliveries", views.AdminDeliveryViewSet, basename="delivery-admin-delivery")
router.register("admin/zones", views.AdminZoneViewSet, basename="delivery-admin-zone")
router.register("admin/surges", views.AdminSurgeViewSet, basename="delivery-admin-surge")

urlpatterns = [
    path("meta/", views.MetaView.as_view(), name="delivery-meta"),
    path("requests/quote/", views.QuoteView.as_view(), name="delivery-quote"),

    path("rider/apply/", views.RiderApplyView.as_view(), name="rider-apply"),
    path("rider/me/", views.RiderMeView.as_view(), name="rider-me"),
    path("rider/documents/", views.RiderDocumentView.as_view(), name="rider-documents"),
    path("rider/bank/", views.RiderBankView.as_view(), name="rider-bank"),
    path("rider/commission/pay-wallet/", views.RiderCommissionPayView.as_view(), name="rider-commission-pay"),
    path("rider/availability/", views.RiderAvailabilityView.as_view(), name="rider-availability"),
    path("rider/location/", views.RiderLocationView.as_view(), name="rider-location"),
    path("rider/offers/", views.RiderOffersView.as_view(), name="rider-offers"),
    path("rider/offers/<int:offer_id>/<str:verb>/", views.RiderOfferActionView.as_view(),
         name="rider-offer-action"),
    path("rider/active/", views.RiderActiveView.as_view(), name="rider-active"),
    path("rider/jobs/", views.RiderJobsView.as_view(), name="rider-jobs"),
    path("rider/deliveries/<uuid:delivery_id>/", views.RiderDeliveryDetailView.as_view(),
         name="rider-delivery"),
    path("rider/deliveries/<uuid:delivery_id>/<str:verb>/", views.RiderDeliveryActionView.as_view(),
         name="rider-delivery-action"),
    path("rider/earnings/", views.RiderEarningsView.as_view(), name="rider-earnings"),

    path("admin/overview/", views.AdminOverviewView.as_view(), name="delivery-admin-overview"),
    path("admin/settings/", views.AdminSettingsView.as_view(), name="delivery-admin-settings"),
    path("admin/quote-preview/", views.AdminQuotePreviewView.as_view(), name="delivery-admin-quote"),

    path("internal/tick/", views.TickView.as_view(), name="delivery-tick"),
    path("", include(router.urls)),
]
