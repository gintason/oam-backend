from django.contrib import admin

from .models import (
    DeliveryEvent,
    DeliveryRequest,
    DeliveryTransaction,
    DeliveryZone,
    DispatchOffer,
    DispatchSettings,
    RiderDocument,
    RiderProfile,
    SurgePricing,
)


class RiderDocumentInline(admin.TabularInline):
    model = RiderDocument
    extra = 0


@admin.register(RiderProfile)
class RiderProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "vehicle_type", "verification_status", "availability",
                    "completed_deliveries", "rating_avg", "created_at")
    list_filter = ("verification_status", "availability", "vehicle_type")
    search_fields = ("full_name", "phone", "user__email", "vehicle_plate")
    raw_id_fields = ("user", "reviewed_by")
    inlines = [RiderDocumentInline]


class DeliveryEventInline(admin.TabularInline):
    model = DeliveryEvent
    extra = 0
    readonly_fields = ("status", "note", "actor", "lat", "lng", "created_at")


class DispatchOfferInline(admin.TabularInline):
    model = DispatchOffer
    extra = 0
    readonly_fields = ("rider", "round", "distance_km", "status", "expires_at", "responded_at")


@admin.register(DeliveryRequest)
class DeliveryRequestAdmin(admin.ModelAdmin):
    list_display = ("reference", "customer", "status", "payment_status", "fee", "rider", "created_at")
    list_filter = ("status", "payment_status", "payment_method", "package_category")
    search_fields = ("reference", "customer__email", "recipient_phone", "payment_reference")
    raw_id_fields = ("customer", "rider", "zone")
    readonly_fields = ("reference", "fee", "rider_payout", "platform_fee", "delivery_code")
    inlines = [DeliveryEventInline, DispatchOfferInline]


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "radius_km", "base_fare", "per_km", "min_fare", "is_active")


@admin.register(SurgePricing)
class SurgePricingAdmin(admin.ModelAdmin):
    list_display = ("multiplier", "zone", "reason", "starts_at", "ends_at", "is_active")


@admin.register(DeliveryTransaction)
class DeliveryTransactionAdmin(admin.ModelAdmin):
    list_display = ("delivery", "rider", "gross_amount", "rider_payout", "platform_fee", "status",
                    "settled_at")
    list_filter = ("status",)


admin.site.register(DispatchSettings)
