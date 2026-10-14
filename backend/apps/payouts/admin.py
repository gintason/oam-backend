from django.contrib import admin, messages

from .models import BankAccount, WithdrawalOrder


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("account_name", "account_number", "bank_code", "user", "is_active")
    search_fields = ("account_name", "account_number", "user__email")


@admin.register(WithdrawalOrder)
class WithdrawalOrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "amount", "currency", "status", "user", "queued_at", "attempts", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("reference", "provider_reference", "transfer_reference", "user__email")
    readonly_fields = [f.name for f in WithdrawalOrder._meta.fields]
    actions = ["retry_now", "cancel_and_refund"]

    def changelist_view(self, request, extra_context=None):
        # Queue overview on top of the list: what's waiting and what to top up.
        try:
            from .services import WithdrawalService
            s = WithdrawalService.queue_summary("NGN")
            if s["count"]:
                bal = "unknown" if s["balance"] is None else f"₦{s['balance']:,.2f}"
                need = (f" Top up Paystack by at least ₦{s['shortfall']:,.2f}, then use “Retry now”."
                        if s["shortfall"] else " The balance may cover them — select them and use “Retry now”.")
                self.message_user(request, f"{s['count']} withdrawal(s) waiting — ₦{s['total']:,.2f} in total. "
                                           f"Paystack balance: {bal}.{need}", messages.WARNING)
        except Exception:
            pass
        return super().changelist_view(request, extra_context)

    @admin.action(description="Retry now (send queued withdrawals the balance allows)")
    def retry_now(self, request, queryset):
        from .services import WithdrawalService
        ids = list(queryset.filter(status=WithdrawalOrder.Status.QUEUED).values_list("id", flat=True))
        if not ids:
            self.message_user(request, "None of the selected withdrawals are queued.", messages.INFO)
            return
        st = WithdrawalService.process_queue(only_ids=ids)
        self.message_user(request, f"Sent {st['sent']}, still waiting {st['still_queued']}, "
                                   f"failed {st['failed']}, refunded (overdue) {st['refunded_overdue']}.",
                          messages.SUCCESS if st["sent"] else messages.WARNING)

    @admin.action(description="Cancel & refund to wallet (queued only)")
    def cancel_and_refund(self, request, queryset):
        from .services import WithdrawalError, WithdrawalService
        done = 0
        for o in queryset.filter(status=WithdrawalOrder.Status.QUEUED):
            try:
                WithdrawalService.cancel(o, by_staff=True)
                done += 1
            except WithdrawalError:
                pass
        self.message_user(request, f"Cancelled and refunded {done} withdrawal(s).", messages.SUCCESS)
