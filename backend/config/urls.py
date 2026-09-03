"""Root URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/", include("apps.common.urls")),
    # Domain apps are wired in phase by phase:
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/wallet/", include("apps.wallet.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/payouts/", include("apps.payouts.urls")),
    path("api/v1/marketplace/", include("apps.marketplace.urls")),
    path("api/v1/referrals/", include("apps.referrals.urls")),
    path("api/v1/assistant/", include("apps.assistant.urls")),
    path("api/v1/messaging/", include("apps.messaging.urls")),
    path("api/v1/homeservices/", include("apps.homeservices.urls")),
    path("api/v1/uploads/", include("apps.uploads.urls")),
    path("api/v1/affiliates/", include("apps.affiliates.urls")),
    path("api/v1/bus/", include("apps.travu.urls")),
    path("api/v1/travu/", include("apps.travu.urls")),
    # OpenAPI schema + docs (drives the typed web/mobile clients)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
   
   
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
