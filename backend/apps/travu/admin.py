from django.contrib import admin

from .models import BusBooking, BusPassenger, TravuApiLog


class PassengerInline(admin.TabularInline):
    model = BusPassenger
    extra = 0


@admin.register(BusBooking)
class BusBookingAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "departure_state", "destination_state",
                    "total_seats", "total_amount", "status", "created_at")
    list_filter = ("status", "provider")
    search_fields = ("reference", "travu_order_id", "user__email")
    inlines = [PassengerInline]


admin.site.register(TravuApiLog)
