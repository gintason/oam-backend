from django.contrib import admin, messages
from django.utils import timezone

from .models import (
    JobComment,
    ApplicationStatusEvent,
    CandidateProfile,
    ChatMessage,
    ChatThread,
    EmployerProfile,
    EmployerSubscription,
    JobApplication,
    JobFlag,
    JobListing,
    JobPayment,
    JobPostCredit,
    SavedSearch,
)


class SubscriptionInline(admin.StackedInline):
    model = EmployerSubscription
    extra = 0


@admin.register(EmployerProfile)
class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "owner", "verification_status", "subscription_tier",
                    "is_active", "created_at")
    list_filter = ("verification_status", "is_active", "industry")
    search_fields = ("company_name", "owner__email", "registration_number")
    readonly_fields = ("slug", "verified_at", "created_at", "updated_at")
    inlines = [SubscriptionInline]
    actions = ["verify", "reject"]

    @admin.action(description="Mark as verified")
    def verify(self, request, qs):
        n = qs.update(verification_status=EmployerProfile.Verification.VERIFIED,
                      verified_at=timezone.now())
        self.message_user(request, f"{n} employer(s) verified.")

    @admin.action(description="Reject verification")
    def reject(self, request, qs):
        n = qs.update(verification_status=EmployerProfile.Verification.REJECTED)
        self.message_user(request, f"{n} employer(s) rejected.", messages.WARNING)


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "headline", "years_experience", "open_to_work", "is_searchable",
                    "updated_at")
    list_filter = ("open_to_work", "is_searchable", "experience_level", "country")
    search_fields = ("user__email", "headline", "skills_text")


class FlagInline(admin.TabularInline):
    model = JobFlag
    fk_name = "job"
    extra = 0
    readonly_fields = ("kind", "reason", "score", "related_job", "reported_by", "created_at")


@admin.register(JobListing)
class JobListingAdmin(admin.ModelAdmin):
    list_display = ("title", "employer", "status", "location_type", "is_flagged", "risk_score",
                    "applications_count", "published_at", "expires_at")
    list_filter = ("status", "is_flagged", "location_type", "employment_type", "category")
    search_fields = ("title", "employer__company_name", "description")
    readonly_fields = ("slug", "views_count", "applications_count", "content_hash",
                       "risk_score", "created_at", "updated_at")
    inlines = [FlagInline]
    actions = ["approve", "reject", "expire_now"]

    @admin.action(description="Approve & publish (pending review)")
    def approve(self, request, qs):
        from .services import JobsError, JobService
        ok = 0
        for job in qs.filter(status=JobListing.Status.PENDING_REVIEW):
            try:
                JobService.approve(job)
                ok += 1
            except JobsError as exc:
                self.message_user(request, f"{job}: {exc}", messages.ERROR)
        self.message_user(request, f"{ok} listing(s) approved.")

    @admin.action(description="Reject (take down)")
    def reject(self, request, qs):
        n = qs.update(status=JobListing.Status.REJECTED, is_featured=False, is_boosted=False)
        JobFlag.objects.filter(job__in=qs, resolved=False).update(resolved=True,
                                                                 resolved_at=timezone.now())
        self.message_user(request, f"{n} listing(s) rejected.", messages.WARNING)

    @admin.action(description="Expire now")
    def expire_now(self, request, qs):
        n = qs.update(status=JobListing.Status.EXPIRED, expires_at=timezone.now())
        self.message_user(request, f"{n} listing(s) expired.")


class EventInline(admin.TabularInline):
    model = ApplicationStatusEvent
    extra = 0
    readonly_fields = ("from_status", "to_status", "changed_by", "note", "created_at")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("candidate", "job", "status", "match_score", "created_at")
    list_filter = ("status", "source")
    search_fields = ("candidate__user__email", "job__title")
    inlines = [EventInline]


@admin.register(JobFlag)
class JobFlagAdmin(admin.ModelAdmin):
    list_display = ("job", "kind", "score", "resolved", "created_at")
    list_filter = ("kind", "resolved")
    search_fields = ("job__title", "reason")
    actions = ["resolve"]

    @admin.action(description="Mark resolved")
    def resolve(self, request, qs):
        qs.update(resolved=True, resolved_at=timezone.now())


@admin.register(JobPayment)
class JobPaymentAdmin(admin.ModelAdmin):
    list_display = ("reference", "employer", "purpose", "plan", "amount", "currency", "status",
                    "created_at")
    list_filter = ("purpose", "status", "provider")
    search_fields = ("reference", "employer__company_name")
    readonly_fields = [f.name for f in JobPayment._meta.fields]


admin.site.register(JobPostCredit)
admin.site.register(SavedSearch)


class MessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("sender", "kind", "body", "attachment_url", "created_at")


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ("employer", "candidate", "job", "last_message_at", "is_closed")
    inlines = [MessageInline]


@admin.register(JobComment)
class JobCommentAdmin(admin.ModelAdmin):
    """Moderate public comments on job posts (delete abusive ones)."""
    list_display = ("job", "user", "short_body", "created_at")
    search_fields = ("body", "job__title", "user__email")
    raw_id_fields = ("job", "user")
    list_select_related = ("job", "user")

    @admin.display(description="Comment")
    def short_body(self, obj):
        return (obj.body[:80] + "…") if len(obj.body) > 80 else obj.body
