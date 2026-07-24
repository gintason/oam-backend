from django.urls import path

from .views import UploadRulesView, UploadTicketView

urlpatterns = [
    path("ticket/", UploadTicketView.as_view(), name="upload-ticket"),
    path("rules/", UploadRulesView.as_view(), name="upload-rules"),
]
