from django.contrib import admin

from .models import AffiliateClick


@admin.register(AffiliateClick)
class AffiliateClickAdmin(admin.ModelAdmin):
    list_display = ("program", "category", "user", "status", "commission_amount",
                    "commission_currency", "created_at")
    list_filter = ("category", "status", "provider")
    search_fields = ("program", "user__email", "id")
    readonly_fields = ("id", "created_at", "updated_at")
