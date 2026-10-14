from django.contrib import admin

from .models import BankAccount, WithdrawalOrder


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("account_name", "account_number", "bank_code", "user", "is_active")
    search_fields = ("account_name", "account_number", "user__email")


@admin.register(WithdrawalOrder)
class WithdrawalOrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "amount", "currency", "status", "user", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("reference", "provider_reference", "user__email")
    readonly_fields = [f.name for f in WithdrawalOrder._meta.fields]
