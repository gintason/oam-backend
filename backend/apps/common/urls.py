from django.urls import path
from .receipts import PublicReceiptView

from .views import HealthView, LanguagesView

urlpatterns = [
    path("receipts/<str:reference>/", PublicReceiptView.as_view(), name="public-receipt"),
    path("health/", HealthView.as_view(), name="health"),
    path("languages/", LanguagesView.as_view(), name="languages"),
]
