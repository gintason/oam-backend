from django.contrib import admin

from .models import JournalEntry, LedgerAccount, LedgerPosting, Wallet


class PostingInline(admin.TabularInline):
    model = LedgerPosting
    extra = 0
    can_delete = False
    readonly_fields = ("account", "direction", "amount", "currency", "created_at")


@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = ("code", "type", "currency", "is_system", "owner")
    list_filter = ("type", "currency", "is_system")
    search_fields = ("code", "name")


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("reference", "currency", "description", "created_at")
    list_filter = ("currency",)
    search_fields = ("reference", "idempotency_key", "description")
    inlines = [PostingInline]
    readonly_fields = ("reference", "idempotency_key", "currency", "description",
                       "metadata", "reverses", "created_at")


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "currency", "cached_balance", "version", "updated_at")
    list_filter = ("currency",)
    search_fields = ("user__email", "user__phone")
    readonly_fields = ("user", "currency", "account", "cached_balance", "version")
