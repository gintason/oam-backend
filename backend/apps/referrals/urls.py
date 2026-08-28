from django.urls import path

from .views import DashboardView, GenerateLinkView

urlpatterns = [
    path("generate-link/", GenerateLinkView.as_view(), name="referral-generate-link"),
    path("dashboard/", DashboardView.as_view(), name="referral-dashboard"),
]
