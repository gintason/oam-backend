from django.contrib import admin

from .models import Biller, BillOrder


@admin.register(Biller)
class BillerAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "category", "country", "is_active")
    list_filter = ("country", "category", "is_active")
    search_fields = ("name", "code")


@admin.register(BillOrder)
class BillOrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "category", "recipient", "amount", "currency",
                    "status", "user", "created_at")
    list_filter = ("category", "status", "currency")
    search_fields = ("reference", "recipient", "provider_reference", "user__email")
    readonly_fields = [f.name for f in BillOrder._meta.fields]
