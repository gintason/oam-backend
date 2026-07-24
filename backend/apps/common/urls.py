from django.urls import path

from .views import HealthView, LanguagesView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("languages/", LanguagesView.as_view(), name="languages"),
]
