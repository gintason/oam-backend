from django.urls import path

from .views import BlockDetailView, BlockListView, ReportView

urlpatterns = [
    path("reports/", ReportView.as_view(), name="mod-report"),
    path("blocks/", BlockListView.as_view(), name="mod-blocks"),
    path("blocks/<uuid:user_id>/", BlockDetailView.as_view(), name="mod-unblock"),
]
