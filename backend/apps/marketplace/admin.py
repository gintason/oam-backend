from django.contrib import admin

from .models import (Category, Listing, ListingImage, SellerSubscription,
                     SubscriptionPayment)


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_admin_only", "is_active", "order")
    list_filter = ("is_admin_only", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price", "currency", "status", "is_featured",
                    "seller", "expires_at")
    list_filter = ("status", "is_featured", "category", "condition")
    search_fields = ("title", "description", "seller__email")
    inlines = [ListingImageInline]


@admin.register(SellerSubscription)
class SellerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "expires_at")
    list_filter = ("tier",)


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "tier", "amount", "currency", "status", "created_at")
    list_filter = ("tier", "currency", "status")
    search_fields = ("reference", "user__email")
