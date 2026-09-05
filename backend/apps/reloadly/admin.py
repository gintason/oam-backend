from django.contrib import admin

from .models import AirtimeApiLog, AirtimeTopup


@admin.register(AirtimeTopup)
class AirtimeTopupAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "operator_name", "recipient_number",
                    "total_ngn", "markup_ngn", "status", "created_at")
    list_filter = ("status", "country_iso")
    search_fields = ("reference", "reloadly_transaction_id", "recipient_number", "user__email")


admin.site.register(AirtimeApiLog)
