from django.contrib import admin
from django.utils import timezone

from .models import (Category, Listing, ListingImage, ListingVideo,
                     SellerSubscription, SubscriptionPayment)


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0


class ListingVideoInline(admin.TabularInline):
    model = ListingVideo
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_admin_only", "is_active", "order")
    list_filter = ("is_admin_only", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.action(description="Verify selected listings (attach badge)")
def verify_listings(modeladmin, request, queryset):
    queryset.update(is_verified=True, verified_at=timezone.now(), verified_by=request.user)


@admin.action(description="Remove verification from selected listings")
def unverify_listings(modeladmin, request, queryset):
    queryset.update(is_verified=False, verified_at=None, verified_by=None)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price", "currency", "status", "is_verified",
                    "is_featured", "seller", "expires_at")
    list_filter = ("status", "is_verified", "is_featured", "category", "condition")
    search_fields = ("title", "description", "seller__email")
    readonly_fields = ("verified_at", "verified_by")
    actions = [verify_listings, unverify_listings]
    inlines = [ListingImageInline, ListingVideoInline]


@admin.register(SellerSubscription)
class SellerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "expires_at")
    list_filter = ("tier",)


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "tier", "amount", "currency", "status", "created_at")
    list_filter = ("tier", "currency", "status")
    search_fields = ("reference", "user__email")
