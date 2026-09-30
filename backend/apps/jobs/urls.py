"""Mounted at /api/v1/jobs/ in config/urls.py."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("employers", views.EmployerViewSet, basename="jobs-employer")
router.register("candidates", views.CandidateViewSet, basename="jobs-candidate")
router.register("listings", views.JobListingViewSet, basename="jobs-listing")
router.register("applications", views.ApplicationViewSet, basename="jobs-application")
router.register("saved-searches", views.SavedSearchViewSet, basename="jobs-saved-search")
router.register("threads", views.ChatThreadViewSet, basename="jobs-thread")

urlpatterns = [
    path("meta/", views.MetaView.as_view(), name="jobs-meta"),
    path("dashboard/employer/", views.EmployerDashboardView.as_view(),
         name="jobs-dashboard-employer"),
    path("billing/plans/", views.PlansView.as_view(), name="jobs-plans"),
    path("billing/subscription/", views.SubscriptionView.as_view(), name="jobs-subscription"),
    path("billing/checkout/", views.CheckoutView.as_view(), name="jobs-checkout"),
    path("billing/verify/", views.VerifyPaymentView.as_view(), name="jobs-verify"),
    path("billing/payments/", views.PaymentHistoryView.as_view(), name="jobs-payments"),
    path("billing/webhook/", views.JobsPaymentWebhookView.as_view(), name="jobs-webhook"),
    path("internal/maintenance/", views.MaintenanceTriggerView.as_view(),
         name="jobs-maintenance-trigger"),
    path("", include(router.urls)),
]
