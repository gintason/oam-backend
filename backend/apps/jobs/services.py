"""
Jobs domain logic. Views stay thin; every rule lives here so the REST API, the
WebSocket consumer, Celery tasks and the admin all behave the same way.
"""
from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import (
    CANDIDATE_WITHDRAWABLE,
    EMPLOYER_TRANSITIONS,
    PIPELINE,
    ApplicationStatus,
    ApplicationStatusEvent,
    CandidateProfile,
    CandidateProfileView,
    ChatMessage,
    ChatThread,
    EmployerProfile,
    EmployerSubscription,
    JobAlertDelivery,
    JobApplication,
    JobListing,
    JobPayment,
    JobPostCredit,
    SavedSearch,
)
from .plans import (
    BOOST_DAY_OPTIONS,
    JOB_CREDIT_DAYS,
    PAID_PLANS,
    PLAN_PERIOD_DAYS,
    boost_price,
    get_plan,
    job_credit_price,
    plan_price,
    resolve_payment_currency,
)
from .realtime.events import broadcast

logger = logging.getLogger(__name__)


class JobsError(Exception):
    """A user-facing rule violation. `code` lets clients react (e.g. show upgrade)."""

    def __init__(self, message, code="invalid", status=400):
        super().__init__(message)
        self.code = code
        self.status = status


def _display_name(user) -> str:
    name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return name or (getattr(user, "email", "") or "").split("@")[0] or "OAM user"


def notify_user(user, *, title, body="", data=None, email=False, kind="general"):
    """Bell feed + push (via apps.notifications) + live socket event."""
    data = {"module": "jobs", **(data or {})}
    try:
        from apps.notifications.services import notify
        transaction.on_commit(lambda: notify(user, kind=kind, title=title, body=body,
                                             data=data, email=email))
    except Exception:
        logger.warning("jobs notify failed", exc_info=True)
    broadcast([user.id], "notification", {"title": title, "body": body, "data": data})


def push_only(user, *, title, body, data=None):
    """Push without a bell-feed row — used for chat, where a row per message is noise."""
    def _go():
        try:
            from apps.notifications.push import send_push_to_user
            send_push_to_user(user, title, body, {"module": "jobs", **(data or {})})
        except Exception:
            logger.warning("jobs push failed", exc_info=True)
    transaction.on_commit(_go)


def dispatch(task_name: str, *args):
    """
    Run a background job after commit: on Celery if JOBS_USE_CELERY is on,
    otherwise inline. Inline keeps the feature working on hosts with no worker
    (e.g. a single Render web service); switch Celery on when volume grows.
    """
    def _go():
        from . import tasks
        task = getattr(tasks, task_name)
        try:
            if getattr(settings, "JOBS_USE_CELERY", False):
                task.delay(*args)
            else:
                task(*args)
        except Exception:
            logger.exception("jobs dispatch %s failed", task_name)
    transaction.on_commit(_go)


# --------------------------------------------------------------------------- #
# Profiles
# --------------------------------------------------------------------------- #

class ProfileService:
    @staticmethod
    def employer_for(user) -> EmployerProfile | None:
        if not user.is_authenticated:
            return None
        return EmployerProfile.objects.select_related("subscription") \
            .filter(owner=user).first()

    @staticmethod
    def require_employer(user) -> EmployerProfile:
        employer = ProfileService.employer_for(user)
        if employer is None:
            raise JobsError("Create your company profile first.", code="no_employer_profile",
                            status=403)
        if not employer.is_active:
            raise JobsError("This company account is suspended.", code="employer_suspended",
                            status=403)
        return employer

    @staticmethod
    def candidate_for(user, create=False) -> CandidateProfile | None:
        if not user.is_authenticated:
            return None
        if create:
            profile, _ = CandidateProfile.objects.get_or_create(user=user)
            return profile
        return CandidateProfile.objects.filter(user=user).first()

    @staticmethod
    def subscription(employer) -> EmployerSubscription:
        sub = getattr(employer, "subscription", None)
        if sub is None:
            sub, _ = EmployerSubscription.objects.get_or_create(employer=employer)
        return sub


# --------------------------------------------------------------------------- #
# Entitlements (plan limits)
# --------------------------------------------------------------------------- #

class EntitlementService:
    @staticmethod
    def plan(employer):
        return get_plan(ProfileService.subscription(employer).active_plan)

    @staticmethod
    def plan_jobs_in_use(employer) -> int:
        """Live listings that count against the plan (credit-posted ones don't)."""
        return JobListing.objects.filter(
            employer=employer, posted_with_credit=False,
            status__in=[JobListing.Status.ACTIVE, JobListing.Status.PENDING_REVIEW],
        ).count()

    @staticmethod
    def credits_available(employer) -> int:
        now = timezone.now()
        return sum(c.remaining for c in JobPostCredit.objects.filter(
            employer=employer, expires_at__gt=now, used__lt=F("quantity")))

    @staticmethod
    def featured_in_use(employer) -> int:
        return JobListing.objects.filter(employer=employer, is_featured=True,
                                         featured_until__gt=timezone.now()).count()

    @staticmethod
    def candidate_views_this_month(employer) -> int:
        start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return CandidateProfileView.objects.filter(employer=employer, viewed_at__gte=start) \
            .values("candidate").distinct().count()

    @staticmethod
    def usage(employer) -> dict:
        plan = EntitlementService.plan(employer)
        sub = ProfileService.subscription(employer)
        return {
            "plan": plan.as_dict(),
            "subscription": {
                "plan": sub.plan, "active_plan": sub.active_plan, "status": sub.status,
                "current_period_end": sub.current_period_end,
            },
            "active_jobs": EntitlementService.plan_jobs_in_use(employer),
            "active_job_limit": plan.active_job_limit,
            "job_credits": EntitlementService.credits_available(employer),
            "featured_in_use": EntitlementService.featured_in_use(employer),
            "featured_slots": plan.featured_slots,
            "candidate_views_used": EntitlementService.candidate_views_this_month(employer),
            "candidate_views_per_month": plan.candidate_views_per_month,
        }

    @staticmethod
    def publish_route(employer, job=None) -> str:
        """'plan' if the plan has room, 'credit' if a pay-per-job credit covers it."""
        if job is not None and job.posted_with_credit:
            return "credit_existing"
        plan = EntitlementService.plan(employer)
        in_use = EntitlementService.plan_jobs_in_use(employer)
        if job is not None and job.status in (JobListing.Status.ACTIVE,
                                              JobListing.Status.PENDING_REVIEW):
            in_use -= 1
        if plan.active_job_limit is None or in_use < plan.active_job_limit:
            return "plan"
        if EntitlementService.credits_available(employer) > 0:
            return "credit"
        raise JobsError(
            f"Your {plan.label} plan allows {plan.active_job_limit} active job"
            f"{'s' if plan.active_job_limit != 1 else ''}. Upgrade your plan or buy a "
            f"single job post to publish more.",
            code="job_limit_reached", status=402)

    @staticmethod
    def consume_credit(employer):
        now = timezone.now()
        credit = (JobPostCredit.objects.select_for_update()
                  .filter(employer=employer, expires_at__gt=now, used__lt=F("quantity"))
                  .order_by("expires_at").first())
        if credit is None:
            raise JobsError("You have no job credits left.", code="job_limit_reached",
                            status=402)
        credit.used = F("used") + 1
        credit.save(update_fields=["used", "updated_at"])

    @staticmethod
    def require_feature(employer, feature: str, message: str):
        plan = EntitlementService.plan(employer)
        if not getattr(plan, feature):
            raise JobsError(message, code="upgrade_required", status=402)
        return plan

    @staticmethod
    def record_candidate_view(employer, candidate):
        plan = EntitlementService.require_feature(
            employer, "candidate_search",
            "Candidate search is available on Premium and Pro plans.")
        start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        seen = CandidateProfileView.objects.filter(employer=employer, candidate=candidate,
                                                   viewed_at__gte=start).exists()
        if not seen and plan.candidate_views_per_month is not None:
            if EntitlementService.candidate_views_this_month(employer) \
                    >= plan.candidate_views_per_month:
                raise JobsError(
                    f"You've used all {plan.candidate_views_per_month} candidate profile "
                    f"views this month. Upgrade to Pro for unlimited views.",
                    code="candidate_view_limit", status=402)
        CandidateProfileView.objects.create(employer=employer, candidate=candidate)

    @staticmethod
    def unlocked_application_ids(job) -> set | None:
        """
        Free plans see the first N applicants per job; the rest are 'locked'
        (visible as a count with an upgrade prompt). None = everything unlocked.
        """
        cap = EntitlementService.plan(job.employer).applications_per_job
        if cap is None:
            return None
        return set(job.applications.order_by("created_at").values_list("id", flat=True)[:cap])


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #

class JobService:
    @staticmethod
    def validate_for_publish(job):
        errors = {}
        if len((job.title or "").strip()) < 4:
            errors["title"] = "Add a job title."
        if len((job.description or "").strip()) < 50:
            errors["description"] = "Describe the role in at least 50 characters."
        if job.apply_method == JobListing.ApplyMethod.EXTERNAL and not job.external_apply_url:
            errors["external_apply_url"] = "Add the link where candidates apply."
        if job.location_type != "remote" and not (job.location or job.country):
            errors["location"] = "Add a location for on-site or hybrid roles."
        if errors:
            raise JobsError(errors, code="incomplete_listing")

    @staticmethod
    @transaction.atomic
    def publish(job: JobListing, user) -> JobListing:
        job = JobListing.objects.select_for_update().select_related("employer").get(pk=job.pk)
        if job.status == JobListing.Status.ACTIVE and job.is_live:
            return job
        if job.status == JobListing.Status.REJECTED:
            raise JobsError("This listing was rejected by moderation and can't be republished.",
                            code="listing_rejected")
        JobService.validate_for_publish(job)
        route = EntitlementService.publish_route(job.employer, job)

        from .moderation import screen
        verdict = screen(job)
        hold_unverified = (getattr(settings, "JOBS_MODERATE_UNVERIFIED", False)
                           and not job.employer.is_verified)
        if verdict["hold"] or hold_unverified:
            job.status = JobListing.Status.PENDING_REVIEW
            job.moderation_note = "; ".join(verdict["reasons"])[:255] or \
                "Awaiting verification of the employer."
            job.save(update_fields=["status", "moderation_note", "updated_at"])
            return job
        return JobService._go_live(job, route)

    @staticmethod
    def _go_live(job: JobListing, route: str) -> JobListing:
        now = timezone.now()
        plan = EntitlementService.plan(job.employer)
        if route == "credit":
            EntitlementService.consume_credit(job.employer)
            job.posted_with_credit = True
        elif route == "plan":
            job.posted_with_credit = False
        days = max(plan.job_duration_days, JOB_CREDIT_DAYS if job.posted_with_credit else 0)
        first_publish = job.published_at is None or job.status in (
            JobListing.Status.EXPIRED, JobListing.Status.CLOSED)
        job.status = JobListing.Status.ACTIVE
        if first_publish:
            job.published_at = now
        job.expires_at = now + timedelta(days=days)
        job.closed_at = None
        job.save(update_fields=["status", "published_at", "expires_at", "closed_at",
                                "posted_with_credit", "updated_at"])
        from .search import refresh_search_vector
        refresh_search_vector([job.pk])
        if first_publish:
            dispatch("send_instant_alerts_for_job", str(job.pk))
        return job

    @staticmethod
    @transaction.atomic
    def approve(job: JobListing) -> JobListing:
        """Staff approval of a held listing (called from the admin)."""
        job = JobListing.objects.select_for_update().select_related("employer").get(pk=job.pk)
        if job.status != JobListing.Status.PENDING_REVIEW:
            return job
        route = EntitlementService.publish_route(job.employer, job)
        job.is_flagged = False
        job.moderation_note = "Approved by staff"
        job.save(update_fields=["is_flagged", "moderation_note", "updated_at"])
        job.flags.filter(resolved=False).update(resolved=True, resolved_at=timezone.now())
        return JobService._go_live(job, route)

    @staticmethod
    def pause(job):
        if job.status != JobListing.Status.ACTIVE:
            raise JobsError("Only active listings can be paused.")
        job.status = JobListing.Status.PAUSED
        job.save(update_fields=["status", "updated_at"])
        return job

    @staticmethod
    @transaction.atomic
    def resume(job, user):
        if job.status != JobListing.Status.PAUSED:
            raise JobsError("Only paused listings can be resumed.")
        if job.expires_at and job.expires_at <= timezone.now():
            job.status = JobListing.Status.EXPIRED
            job.save(update_fields=["status", "updated_at"])
            raise JobsError("This listing has expired. Renew it to publish again.",
                            code="listing_expired")
        EntitlementService.publish_route(job.employer, job)   # raises if no room
        job.status = JobListing.Status.ACTIVE
        job.save(update_fields=["status", "updated_at"])
        return job

    @staticmethod
    def close(job, reason="closed"):
        if job.status in (JobListing.Status.CLOSED, JobListing.Status.REJECTED):
            return job
        job.status = JobListing.Status.CLOSED
        job.closed_at = timezone.now()
        job.is_featured = False
        job.save(update_fields=["status", "closed_at", "is_featured", "updated_at"])
        return job

    @staticmethod
    def renew(job, user):
        if job.status not in (JobListing.Status.EXPIRED, JobListing.Status.CLOSED,
                              JobListing.Status.ACTIVE):
            raise JobsError("Only active, expired or closed listings can be renewed.")
        if job.status == JobListing.Status.ACTIVE:
            # extend in place — counts as the same slot
            plan = EntitlementService.plan(job.employer)
            job.expires_at = timezone.now() + timedelta(days=plan.job_duration_days)
            job.save(update_fields=["expires_at", "updated_at"])
            return job
        job.posted_with_credit = False
        job.save(update_fields=["posted_with_credit", "updated_at"])
        return JobService.publish(job, user)

    @staticmethod
    def set_featured(job, on: bool):
        if not on:
            job.is_featured = False
            job.featured_until = None
            job.save(update_fields=["is_featured", "featured_until", "updated_at"])
            return job
        if not job.is_live:
            raise JobsError("Only live listings can be featured.")
        plan = EntitlementService.plan(job.employer)
        if EntitlementService.featured_in_use(job.employer) >= plan.featured_slots:
            raise JobsError(
                f"Your {plan.label} plan includes {plan.featured_slots} featured "
                f"listing{'s' if plan.featured_slots != 1 else ''}. Upgrade or buy a boost.",
                code="featured_limit_reached", status=402)
        job.is_featured = True
        job.featured_until = job.expires_at
        job.save(update_fields=["is_featured", "featured_until", "updated_at"])
        return job

    @staticmethod
    def record_view(job, user):
        if user.is_authenticated and user.id == job.employer.owner_id:
            return
        JobListing.objects.filter(pk=job.pk).update(views_count=F("views_count") + 1)


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

STATUS_MESSAGES = {
    ApplicationStatus.UNDER_REVIEW: "Your application is being reviewed.",
    ApplicationStatus.SHORTLISTED: "Good news — you've been shortlisted!",
    ApplicationStatus.INTERVIEW: "You've been invited to interview.",
    ApplicationStatus.OFFER: "You've received an offer!",
    ApplicationStatus.HIRED: "Congratulations — you're hired!",
    ApplicationStatus.REJECTED: "The employer has decided not to move forward.",
}


class ApplicationService:
    @staticmethod
    def apply(*, user, job: JobListing, cover_letter="", answers=None,
              expected_salary=None, cv_url="", source=JobApplication.Source.ONE_CLICK):
        candidate = ProfileService.candidate_for(user, create=True)
        if not job.is_live:
            raise JobsError("This job is no longer accepting applications.", code="job_closed")
        if job.apply_method != JobListing.ApplyMethod.IN_APP:
            raise JobsError("Apply for this job on the employer's website.",
                            code="external_apply")
        if job.employer.owner_id == user.id:
            raise JobsError("You can't apply to your own job.")
        cv = cv_url or candidate.cv_url
        if not cv:
            raise JobsError("Upload your CV to your profile before applying.", code="cv_required")

        answers = answers or []
        answered = {str(a.get("id")): (a.get("answer") or "").strip()
                    for a in answers if isinstance(a, dict)}
        missing = [q.get("question") for q in (job.screening_questions or [])
                   if isinstance(q, dict) and q.get("required")
                   and not answered.get(str(q.get("id")))]
        if missing:
            raise JobsError({"answers": f"Please answer: {missing[0]}"}, code="answers_required")

        from .matching import score
        details = score(candidate, job)
        try:
            with transaction.atomic():
                app = JobApplication.objects.create(
                    job=job, candidate=candidate, cover_letter=(cover_letter or "")[:5000],
                    answers=answers, expected_salary=expected_salary, cv_url=cv,
                    source=source, match_score=details["score"], match_details=details,
                )
                ApplicationStatusEvent.objects.create(
                    application=app, to_status=ApplicationStatus.APPLIED, changed_by=user)
                JobListing.objects.filter(pk=job.pk).update(
                    applications_count=F("applications_count") + 1)
        except IntegrityError:
            raise JobsError("You've already applied for this job.", code="already_applied")

        owner = job.employer.owner
        notify_user(owner, title=f"New applicant for {job.title}",
                    body=f"{candidate.display_name} applied ({details['score']}% match).",
                    data={"type": "application.created", "application_id": str(app.id),
                          "job_id": str(job.id)})
        broadcast([owner.id], "application.created",
                  {"application_id": str(app.id), "job_id": str(job.id),
                   "status": app.status, "match_score": app.match_score})
        return app

    @staticmethod
    @transaction.atomic
    def transition(app: JobApplication, to_status: str, *, actor, note="",
                   interview_at=None, rejection_reason="") -> JobApplication:
        app = JobApplication.objects.select_for_update() \
            .select_related("job__employer", "candidate__user").get(pk=app.pk)
        if actor.id != app.job.employer.owner_id:
            raise JobsError("Only the employer can move applications.", status=403)
        if to_status not in ApplicationStatus.values:
            raise JobsError("Unknown status.")
        if to_status == app.status:
            return app
        if to_status not in EMPLOYER_TRANSITIONS.get(app.status, set()):
            raise JobsError(f"Can't move an application from "
                            f"{ApplicationStatus(app.status).label} to "
                            f"{ApplicationStatus(to_status).label}.", code="invalid_transition")

        previous = app.status
        app.status = to_status
        app.status_changed_at = timezone.now()
        fields = ["status", "status_changed_at", "updated_at"]
        if interview_at is not None:
            app.interview_at = interview_at
            fields.append("interview_at")
        if to_status == ApplicationStatus.REJECTED:
            app.rejection_reason = (rejection_reason or "")[:255]
            fields.append("rejection_reason")
        app.save(update_fields=fields)
        ApplicationStatusEvent.objects.create(application=app, from_status=previous,
                                              to_status=to_status, changed_by=actor,
                                              note=(note or "")[:500])

        label = ApplicationStatus(to_status).label
        thread = ChatThread.objects.filter(application=app).first()
        if thread:
            ChatService.system_message(thread, f"Application moved to {label}.")

        if to_status == ApplicationStatus.HIRED:
            hired = app.job.applications.filter(status=ApplicationStatus.HIRED).count()
            if hired >= app.job.openings:
                JobService.close(app.job)

        candidate_user = app.candidate.user
        notify_user(candidate_user, title=f"{app.job.title} · {label}",
                    body=STATUS_MESSAGES.get(to_status, f"Status changed to {label}."),
                    data={"type": "application.updated", "application_id": str(app.id),
                          "status": to_status}, email=to_status in (
                        ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER,
                        ApplicationStatus.HIRED))
        broadcast([candidate_user.id, actor.id], "application.updated",
                  {"application_id": str(app.id), "job_id": str(app.job_id),
                   "from": previous, "status": to_status})
        return app

    @staticmethod
    def bulk_transition(*, employer, ids, to_status, actor, note=""):
        done, failed = [], []
        apps = JobApplication.objects.filter(id__in=ids, job__employer=employer)
        for app in apps:
            try:
                ApplicationService.transition(app, to_status, actor=actor, note=note)
                done.append(str(app.id))
            except JobsError as exc:
                failed.append({"id": str(app.id), "detail": str(exc)})
        return {"updated": done, "failed": failed}

    @staticmethod
    @transaction.atomic
    def withdraw(app: JobApplication, user):
        if app.candidate.user_id != user.id:
            raise JobsError("Not your application.", status=403)
        if app.status not in CANDIDATE_WITHDRAWABLE:
            raise JobsError("This application can no longer be withdrawn.")
        previous = app.status
        app.status = ApplicationStatus.WITHDRAWN
        app.status_changed_at = timezone.now()
        app.save(update_fields=["status", "status_changed_at", "updated_at"])
        ApplicationStatusEvent.objects.create(application=app, from_status=previous,
                                              to_status=app.status, changed_by=user)
        broadcast([app.job.employer.owner_id, user.id], "application.updated",
                  {"application_id": str(app.id), "job_id": str(app.job_id),
                   "from": previous, "status": app.status})
        return app

    @staticmethod
    def mark_viewed(app: JobApplication, user):
        """First time the employer opens an application, it moves to Under review."""
        if user.id != app.job.employer.owner_id or app.viewed_by_employer_at:
            return app
        app.viewed_by_employer_at = timezone.now()
        app.save(update_fields=["viewed_by_employer_at", "updated_at"])
        if app.status == ApplicationStatus.APPLIED:
            return ApplicationService.transition(app, ApplicationStatus.UNDER_REVIEW, actor=user)
        return app


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #

def _allowed_attachment(url: str) -> bool:
    if not url.startswith("https://"):
        return False
    cloud = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    if cloud:
        return url.startswith(f"https://res.cloudinary.com/{cloud}/")
    return True


class ChatService:
    @staticmethod
    def for_application(app: JobApplication, user) -> ChatThread:
        if user.id not in (app.job.employer.owner_id, app.candidate.user_id):
            raise JobsError("Not your application.", status=403)
        thread, _ = ChatThread.objects.get_or_create(
            application=app,
            defaults={"employer": app.job.employer, "candidate": app.candidate,
                      "job": app.job, "started_by": user},
        )
        return thread

    @staticmethod
    def open_direct(*, employer, candidate, user, job=None) -> ChatThread:
        EntitlementService.require_feature(
            employer, "candidate_direct_message",
            "Messaging candidates who haven't applied is a Pro feature.")
        if not candidate.is_searchable:
            raise JobsError("This candidate isn't accepting messages.", status=403)
        thread, _ = ChatThread.objects.get_or_create(
            employer=employer, candidate=candidate, application=None,
            defaults={"job": job, "started_by": user},
        )
        return thread

    @staticmethod
    def send(thread: ChatThread, user, *, body="", attachment=None, client_id="") -> ChatMessage:
        if not thread.is_participant(user):
            raise JobsError("Not your conversation.", status=403)
        if thread.is_closed:
            raise JobsError("This conversation is closed.")
        body = (body or "").strip()[:4000]
        attachment = attachment or {}
        url = (attachment.get("url") or "").strip()
        if url and not _allowed_attachment(url):
            raise JobsError({"attachment": "Upload the file with the attachment uploader."})
        if not body and not url:
            raise JobsError("Write a message or attach a file.")

        if client_id:
            existing = thread.messages.filter(sender=user, client_id=client_id[:64]).first()
            if existing:
                return existing        # retried send — don't duplicate

        with transaction.atomic():
            msg = ChatMessage.objects.create(
                thread=thread, sender=user, body=body, client_id=(client_id or "")[:64],
                kind=ChatMessage.Kind.ATTACHMENT if url else ChatMessage.Kind.TEXT,
                attachment_url=url, attachment_name=(attachment.get("name") or "")[:200],
                attachment_type=(attachment.get("type") or "")[:100],
                attachment_size=attachment.get("size") or None,
            )
            now = msg.created_at
            side_read = ("employer_last_read_at" if thread.side_of(user) == "employer"
                         else "candidate_last_read_at")
            ChatThread.objects.filter(pk=thread.pk).update(
                last_message_at=now, updated_at=now,
                last_message_preview=(body or f"📎 {msg.attachment_name or 'Attachment'}")[:140],
                **{side_read: now})

        from .serializers import ChatMessageSerializer
        payload = ChatMessageSerializer(msg).data
        payload["thread"] = str(thread.id)
        broadcast(thread.participant_ids(), "chat.message", payload)
        other = thread.other_user(user)
        push_only(other, title=_display_name(user),
                  body=body[:120] or "Sent an attachment",
                  data={"type": "chat.message", "thread_id": str(thread.id)})
        return msg

    @staticmethod
    def system_message(thread: ChatThread, text: str):
        msg = ChatMessage.objects.create(thread=thread, kind=ChatMessage.Kind.SYSTEM, body=text)
        ChatThread.objects.filter(pk=thread.pk).update(last_message_at=msg.created_at,
                                                       last_message_preview=text[:140])
        from .serializers import ChatMessageSerializer
        payload = ChatMessageSerializer(msg).data
        payload["thread"] = str(thread.id)
        broadcast(thread.participant_ids(), "chat.message", payload)
        return msg

    @staticmethod
    def mark_read(thread: ChatThread, user):
        if not thread.is_participant(user):
            raise JobsError("Not your conversation.", status=403)
        now = timezone.now()
        field = ("employer_last_read_at" if thread.side_of(user) == "employer"
                 else "candidate_last_read_at")
        ChatThread.objects.filter(pk=thread.pk).update(**{field: now})
        broadcast(thread.participant_ids(), "chat.read",
                  {"thread": str(thread.id), "side": thread.side_of(user), "at": now.isoformat()})

    @staticmethod
    def unread_for(thread: ChatThread, user) -> int:
        last = (thread.employer_last_read_at if thread.side_of(user) == "employer"
                else thread.candidate_last_read_at)
        qs = thread.messages.exclude(sender=user)
        if last:
            qs = qs.filter(created_at__gt=last)
        return qs.count()

    @staticmethod
    def threads_for(user):
        return ChatThread.objects.filter(
            Q(employer__owner=user) | Q(candidate__user=user)
        ).select_related("employer", "candidate__user", "job", "application")


# --------------------------------------------------------------------------- #
# Saved searches & alerts
# --------------------------------------------------------------------------- #

class AlertService:
    @staticmethod
    def params_for(saved: SavedSearch) -> dict:
        params = {k: (",".join(map(str, v)) if isinstance(v, (list, tuple)) else v)
                  for k, v in (saved.filters or {}).items() if v not in (None, "", [])}
        if saved.query:
            params["q"] = saved.query
        params["ordering"] = "newest"
        return params

    @staticmethod
    def matching_jobs(saved: SavedSearch, since=None, base_qs=None):
        from .search import search_jobs
        qs, _ = search_jobs(AlertService.params_for(saved), base_qs=base_qs)
        if since:
            qs = qs.filter(published_at__gt=since)
        return qs.exclude(alert_deliveries__saved_search=saved) \
            .exclude(employer__owner=saved.user)

    @staticmethod
    def _deliver(saved: SavedSearch, jobs: list):
        if not jobs:
            return 0
        first = jobs[0]
        if len(jobs) == 1:
            title = f"New job: {first.title}"
            body = f"{first.employer.company_name} · {first.get_location_type_display()}"
        else:
            title = f"{len(jobs)} new jobs for “{saved.name}”"
            body = ", ".join(j.title for j in jobs[:3]) + ("…" if len(jobs) > 3 else "")
        data = {"type": "job_alert", "saved_search_id": str(saved.id),
                "job_ids": [str(j.id) for j in jobs[:20]]}
        if saved.notify_push or saved.notify_email:
            notify_user(saved.user, title=title, body=body, data=data,
                        email=saved.notify_email)
        JobAlertDelivery.objects.bulk_create(
            [JobAlertDelivery(saved_search=saved, job=j,
                              channel="push" if saved.notify_push else "email") for j in jobs],
            ignore_conflicts=True)
        return len(jobs)

    @staticmethod
    def send_instant_for_job(job: JobListing) -> int:
        if not job.is_live:
            return 0
        sent = 0
        base = JobListing.objects.live().filter(pk=job.pk)
        searches = SavedSearch.objects.filter(
            alert_enabled=True, frequency=SavedSearch.Frequency.INSTANT
        ).exclude(user_id=job.employer.owner_id).select_related("user")
        for saved in searches.iterator():
            if AlertService.matching_jobs(saved, base_qs=base).exists():
                with transaction.atomic():
                    sent += AlertService._deliver(saved, [job])
                    SavedSearch.objects.filter(pk=saved.pk).update(
                        last_alerted_at=timezone.now())
        return sent

    @staticmethod
    def send_digest(saved: SavedSearch, now=None) -> int:
        now = now or timezone.now()
        window = timedelta(days=7 if saved.frequency == SavedSearch.Frequency.WEEKLY else 1)
        since = saved.last_alerted_at or (now - window)
        jobs = list(AlertService.matching_jobs(saved, since=since)[:10])
        with transaction.atomic():
            n = AlertService._deliver(saved, jobs)
            SavedSearch.objects.filter(pk=saved.pk).update(last_alerted_at=now)
        return n

    @staticmethod
    def send_due_digests() -> dict:
        now = timezone.now()
        stats = {"checked": 0, "alerted": 0, "jobs": 0}
        qs = SavedSearch.objects.filter(
            alert_enabled=True,
            frequency__in=[SavedSearch.Frequency.DAILY, SavedSearch.Frequency.WEEKLY],
        ).select_related("user")
        for saved in qs.iterator():
            if not saved.is_due(now):
                continue
            stats["checked"] += 1
            n = AlertService.send_digest(saved, now)
            if n:
                stats["alerted"] += 1
                stats["jobs"] += n
        return stats


# --------------------------------------------------------------------------- #
# Billing
# --------------------------------------------------------------------------- #

class PaymentService:
    @staticmethod
    def _gateway(key=None):
        from integrations.base import ProviderFactory
        key = key or getattr(settings, "JOBS_PAYMENT_PROVIDER", "") or \
            getattr(settings, "LISTING_UPGRADE_PROVIDER", None)
        return ProviderFactory.get("payments", key)

    @staticmethod
    def quote(*, purpose, plan="", quantity=1, days=0, currency="NGN") -> tuple:
        currency = resolve_payment_currency(currency)
        if purpose == JobPayment.Purpose.PLAN:
            if plan not in PAID_PLANS:
                raise JobsError("Choose a paid plan: premium or pro.")
            return plan_price(plan, currency), currency
        if purpose == JobPayment.Purpose.JOB_CREDIT:
            if not 1 <= int(quantity) <= 20:
                raise JobsError("Buy between 1 and 20 job posts at a time.")
            return job_credit_price(currency) * int(quantity), currency
        if purpose == JobPayment.Purpose.BOOST:
            if int(days) not in BOOST_DAY_OPTIONS:
                raise JobsError(f"Boosts are available for {', '.join(map(str, BOOST_DAY_OPTIONS))}"
                                f" days.")
            return boost_price(int(days), currency), currency
        raise JobsError("Unknown purchase type.")

    @staticmethod
    def initiate(*, user, employer, purpose, plan="", quantity=1, days=0, job=None,
                 currency="NGN") -> JobPayment:
        from integrations.base.exceptions import ProviderError
        if purpose == JobPayment.Purpose.BOOST:
            if job is None or job.employer_id != employer.id:
                raise JobsError("Choose one of your listings to boost.")
            if not job.is_live:
                raise JobsError("Only live listings can be boosted.")
        amount, currency = PaymentService.quote(purpose=purpose, plan=plan, quantity=quantity,
                                                days=days, currency=currency)
        reference = f"JOB-{uuid.uuid4().hex[:20]}"
        gateway = PaymentService._gateway()
        try:
            init = gateway.initialize_charge(
                amount=amount, currency=currency, reference=reference,
                email=getattr(user, "email", "") or f"{user.id}@users.oam",
                metadata={"purpose": f"jobs_{purpose}", "plan": plan, "user": str(user.id),
                          "employer": str(employer.id),
                          "name": _display_name(user), "phone": getattr(user, "phone", "") or ""},
            )
        except ProviderError as exc:
            raise JobsError(f"Could not start payment: {exc}", status=502)
        return JobPayment.objects.create(
            employer=employer, user=user, purpose=purpose, plan=plan or "", job=job,
            quantity=int(quantity or 1), days=int(days or 0), amount=amount, currency=currency,
            reference=reference, provider=gateway.provider_key,
            authorization_url=init.authorization_url or "", raw=init.raw or {},
        )

    @staticmethod
    def activate(payment: JobPayment) -> JobPayment:
        """Apply what was bought. Idempotent — webhook and client verify may both call it."""
        with transaction.atomic():
            p = JobPayment.objects.select_for_update().select_related("employer").get(pk=payment.pk)
            if p.status == JobPayment.Status.PAID:
                return p
            now = timezone.now()
            p.status = JobPayment.Status.PAID
            p.paid_at = now
            p.save(update_fields=["status", "paid_at", "updated_at"])

            if p.purpose == JobPayment.Purpose.PLAN:
                sub = ProfileService.subscription(p.employer)
                extend = (sub.active_plan == p.plan and sub.current_period_end
                          and sub.current_period_end > now)
                start = sub.current_period_end if extend else now
                sub.plan = p.plan
                sub.status = EmployerSubscription.Status.ACTIVE
                if not extend:
                    sub.current_period_start = now
                sub.current_period_end = start + timedelta(days=PLAN_PERIOD_DAYS)
                sub.expiry_reminder_sent_at = None
                sub.save()
            elif p.purpose == JobPayment.Purpose.JOB_CREDIT:
                JobPostCredit.objects.create(employer=p.employer, payment=p, quantity=p.quantity,
                                             expires_at=now + timedelta(days=90))
            elif p.purpose == JobPayment.Purpose.BOOST and p.job_id:
                job = JobListing.objects.select_for_update().get(pk=p.job_id)
                base = job.boosted_until if job.boosted_until and job.boosted_until > now else now
                job.is_boosted = True
                job.boosted_until = base + timedelta(days=p.days)
                if job.expires_at and job.expires_at < job.boosted_until:
                    job.expires_at = job.boosted_until      # a boost never outlives its job
                job.save(update_fields=["is_boosted", "boosted_until", "expires_at", "updated_at"])

            try:
                from apps.referrals.hooks import settle_referral
                settle_referral(user=p.user, oam_profit=p.amount, currency=p.currency,
                                source_reference=p.reference)
            except Exception:
                pass
        notify_user(p.user, title="Payment received",
                    body=f"{p.get_purpose_display()} · {p.currency} {p.amount:,.2f}",
                    data={"type": "jobs.payment", "reference": p.reference})
        return p

    @staticmethod
    def _check_and_activate(payment: JobPayment) -> JobPayment:
        from integrations.base.dto import TxnStatus
        from integrations.base.exceptions import ProviderError
        if payment.status == JobPayment.Status.PAID:
            return payment
        gateway = PaymentService._gateway(payment.provider or None)
        try:
            result = gateway.verify_charge(payment.reference)
        except ProviderError as exc:
            raise JobsError(f"Could not verify payment: {exc}", status=502)
        if result.status == TxnStatus.SUCCESS:
            reported = getattr(result, "amount", None)
            ccy = (getattr(result, "currency", "") or "").upper()
            if ccy and ccy != payment.currency.upper():
                logger.error("jobs payment %s currency mismatch %s", payment.reference, ccy)
                return payment
            if reported and Decimal(str(reported)) and Decimal(str(reported)) < payment.amount:
                logger.error("jobs payment %s amount mismatch %s", payment.reference, reported)
                return payment
            return PaymentService.activate(payment)
        if result.status == TxnStatus.FAILED:
            payment.status = JobPayment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])
        return payment

    @staticmethod
    def verify(*, user, reference) -> JobPayment:
        payment = JobPayment.objects.filter(reference=reference, user=user).first()
        if payment is None:
            raise JobsError("Payment not found.", status=404)
        return PaymentService._check_and_activate(payment)

    @staticmethod
    def activate_by_reference(reference: str) -> bool:
        """Webhook path. Never trusts the payload: re-verifies with the gateway."""
        if not (reference or "").startswith("JOB-"):
            return False
        payment = JobPayment.objects.filter(reference=reference).first()
        if payment is None:
            return False
        try:
            PaymentService._check_and_activate(payment)
        except JobsError:
            logger.warning("jobs webhook verify failed for %s", reference)
        return True


# --------------------------------------------------------------------------- #
# Maintenance (Celery beat or `manage.py jobs_maintenance`)
# --------------------------------------------------------------------------- #

class MaintenanceService:
    @staticmethod
    def expire_listings() -> int:
        now = timezone.now()
        expired = list(JobListing.objects.filter(
            status__in=[JobListing.Status.ACTIVE, JobListing.Status.PAUSED],
            expires_at__lte=now).select_related("employer__owner")[:1000])
        if not expired:
            return 0
        JobListing.objects.filter(pk__in=[j.pk for j in expired]).update(
            status=JobListing.Status.EXPIRED, is_featured=False, is_boosted=False, updated_at=now)
        for job in expired:
            notify_user(job.employer.owner, title="Job listing expired",
                        body=f"“{job.title}” has expired. Renew it to keep receiving applicants.",
                        data={"type": "job.expired", "job_id": str(job.id)})
        return len(expired)

    @staticmethod
    def expire_promotions() -> int:
        now = timezone.now()
        a = JobListing.objects.filter(is_boosted=True, boosted_until__lte=now) \
            .update(is_boosted=False)
        b = JobListing.objects.filter(is_featured=True, featured_until__lte=now) \
            .update(is_featured=False)
        return a + b

    @staticmethod
    def rescan_recent(hours=24) -> int:
        """Re-screen recent listings — catches duplicates posted after them."""
        from .moderation import screen
        n = 0
        since = timezone.now() - timedelta(hours=hours)
        for job in JobListing.objects.filter(
                updated_at__gte=since,
                status__in=[JobListing.Status.ACTIVE, JobListing.Status.PENDING_REVIEW]
        ).select_related("employer"):
            if screen(job)["risk_score"]:
                n += 1
        return n

    @staticmethod
    def subscription_reminders() -> int:
        now = timezone.now()
        soon = now + timedelta(days=3)
        n = 0
        for sub in EmployerSubscription.objects.filter(
                plan__in=PAID_PLANS, current_period_end__gt=now, current_period_end__lte=soon,
                expiry_reminder_sent_at__isnull=True).select_related("employer__owner"):
            notify_user(sub.employer.owner, title="Your plan renews soon",
                        body=f"Your {get_plan(sub.plan).label} plan ends on "
                             f"{sub.current_period_end:%d %b}. Renew to keep your listings live.",
                        data={"type": "jobs.plan_expiring"}, email=True)
            sub.expiry_reminder_sent_at = now
            sub.save(update_fields=["expiry_reminder_sent_at", "updated_at"])
            n += 1
        return n


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #

class AnalyticsService:
    @staticmethod
    def employer_dashboard(employer, days=30) -> dict:
        since = timezone.now() - timedelta(days=days)
        jobs = JobListing.objects.filter(employer=employer)
        apps = JobApplication.objects.filter(job__employer=employer)

        by_status = {s: 0 for s in ApplicationStatus.values}
        for row in apps.values("status").annotate(n=Count("id")):
            by_status[row["status"]] = row["n"]

        per_day = {str(r["day"]): r["n"] for r in apps.filter(created_at__gte=since)
                   .annotate(day=TruncDate("created_at")).values("day")
                   .annotate(n=Count("id")).order_by("day")}
        series = []
        for i in range(days, -1, -1):
            d = (timezone.now() - timedelta(days=i)).date()
            series.append({"date": str(d), "applications": per_day.get(str(d), 0)})

        # funnel: how many applications ever REACHED each stage
        reached = {}
        for s in PIPELINE:
            if s == ApplicationStatus.REJECTED:
                continue
            reached[s] = ApplicationStatusEvent.objects.filter(
                application__job__employer=employer, to_status=s
            ).values("application").distinct().count()

        hires = ApplicationStatusEvent.objects.filter(
            application__job__employer=employer, to_status=ApplicationStatus.HIRED
        ).select_related("application")
        durations = [(e.created_at - e.application.created_at).days for e in hires]

        top_jobs = list(jobs.order_by("-applications_count")[:5].values(
            "id", "title", "status", "views_count", "applications_count"))
        for j in top_jobs:
            j["conversion"] = round(100 * j["applications_count"] / j["views_count"], 1) \
                if j["views_count"] else 0.0

        views = sum(jobs.values_list("views_count", flat=True))
        return {
            "jobs": {
                "total": jobs.count(),
                "active": jobs.filter(status=JobListing.Status.ACTIVE).count(),
                "draft": jobs.filter(status=JobListing.Status.DRAFT).count(),
                "expired": jobs.filter(status=JobListing.Status.EXPIRED).count(),
            },
            "views": views,
            "applications": {"total": apps.count(),
                             "last_period": apps.filter(created_at__gte=since).count(),
                             "by_status": by_status},
            "series": series,
            "funnel": [{"status": s, "count": n} for s, n in reached.items()],
            "avg_days_to_hire": round(sum(durations) / len(durations), 1) if durations else None,
            "avg_match_score": round(sum(apps.values_list("match_score", flat=True))
                                     / apps.count(), 1) if apps.exists() else None,
            "top_jobs": top_jobs,
            "period_days": days,
        }

    @staticmethod
    def job_analytics(job) -> dict:
        apps = job.applications.all()
        by_status = {s: 0 for s in ApplicationStatus.values}
        for row in apps.values("status").annotate(n=Count("id")):
            by_status[row["status"]] = row["n"]
        buckets = {"0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0}
        for s in apps.values_list("match_score", flat=True):
            key = "80-100" if s >= 80 else "60-79" if s >= 60 else "40-59" if s >= 40 else "0-39"
            buckets[key] += 1
        return {
            "views": job.views_count,
            "applications": job.applications_count,
            "conversion": round(100 * job.applications_count / job.views_count, 1)
            if job.views_count else 0.0,
            "by_status": by_status,
            "match_distribution": buckets,
            "saves": job.saves.count(),
        }

    @staticmethod
    def candidate_dashboard(candidate) -> dict:
        by_status = {s: 0 for s in ApplicationStatus.values}
        for row in candidate.applications.values("status").annotate(n=Count("id")):
            by_status[row["status"]] = row["n"]
        return {
            "applications": {"total": sum(by_status.values()), "by_status": by_status},
            "saved_jobs": candidate.user.saved_jobs.count(),
            "saved_searches": candidate.user.job_saved_searches.count(),
            "profile_completeness": candidate.completeness,
            "profile_views_this_month": candidate.employer_views.filter(
                viewed_at__gte=timezone.now().replace(day=1, hour=0, minute=0, second=0,
                                                      microsecond=0)).count(),
        }
