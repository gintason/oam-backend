from django.contrib import admin

from .models import Block, Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("created_at", "target_type", "reason", "reported_user", "reporter", "status")
    list_filter = ("status", "target_type", "reason")
    search_fields = ("target_id", "details", "reporter__email", "reported_user__email")
    readonly_fields = ("reporter", "target_type", "target_id", "reported_user", "reason",
                       "details", "created_at")
    actions = ["mark_actioned", "mark_dismissed"]

    @admin.action(description="Mark as actioned (content removed / user dealt with)")
    def mark_actioned(self, request, qs):
        qs.update(status=Report.Status.ACTIONED)

    @admin.action(description="Dismiss")
    def mark_dismissed(self, request, qs):
        qs.update(status=Report.Status.DISMISSED)


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("created_at", "blocker", "blocked")
    search_fields = ("blocker__email", "blocked__email")
