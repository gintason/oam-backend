from django.contrib import admin

from .models import ServiceTransaction, WebhookEvent


@admin.register(ServiceTransaction)
class ServiceTransactionAdmin(admin.ModelAdmin):
    list_display = ("internal_reference", "service_type", "provider", "status",
                    "amount", "currency", "user", "created_at")
    list_filter = ("service_type", "status", "provider", "currency")
    search_fields = ("internal_reference", "provider_reference", "user__email")
    readonly_fields = [f.name for f in ServiceTransaction._meta.fields]


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "status", "signature_valid", "created_at")
    list_filter = ("provider", "status", "signature_valid")
    search_fields = ("external_id",)
    readonly_fields = [f.name for f in WebhookEvent._meta.fields]
