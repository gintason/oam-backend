from django.contrib import admin

from .models import ArtisanProfile, BoostPayment, ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ArtisanProfile)
class ArtisanProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "category", "city", "state", "is_verified",
                    "is_featured", "featured_until", "is_available")
    list_filter = ("category", "is_verified", "is_featured", "is_available", "state")
    search_fields = ("business_name", "user__email", "city")


@admin.register(BoostPayment)
class BoostPaymentAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "days", "amount", "status", "created_at")
    list_filter = ("status", "days")
    search_fields = ("reference", "user__email")
