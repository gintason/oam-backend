from django.contrib import admin

from .models import TradeOrder


@admin.register(TradeOrder)
class TradeOrderAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "title", "amount", "status", "user", "reference")
    list_filter = ("kind", "status")
    search_fields = ("reference", "provider_reference", "user__email", "title")
    readonly_fields = [f.name for f in TradeOrder._meta.fields]
