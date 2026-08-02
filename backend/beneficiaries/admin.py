from django.contrib import admin

from .models import Beneficiary


@admin.register(Beneficiary)
class BeneficiaryAdmin(admin.ModelAdmin):
    list_display = (
        "account_identifier",
        "service_type",
        "biller_name",
        "customer_name",
        "user",
        "last_used_at",
    )
    list_filter = ("service_type",)
    search_fields = ("account_identifier", "biller_name", "customer_name", "user__email")
    readonly_fields = ("created_at", "last_used_at")
    ordering = ("-last_used_at",)
