"""
Jobs API (mounted at /api/v1/jobs/). Views are thin: they authenticate,
pick the queryset, and hand everything else to services.py.

Business-rule failures come back as
    {"detail": "...", "code": "job_limit_reached"}          (HTTP 402 / 400 / 403)
so the web and mobile apps can open the right screen (e.g. the upgrade sheet)
from `code` instead of parsing English.
"""
from __future__ import annotations

import json
import logging

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .matching import recommend_candidates_for, recommend_jobs_for, score
from .models import (
    PIPELINE,
    ApplicationStatus,
    CandidateProfile,
    EmployerProfile,
    JobApplication,
    JobFlag,
    JobListing,
    JobPayment,
    SavedJob,
    SavedSearch,
)
from .permissions import IsApplicationParticipant, IsEmployer, IsThreadParticipant
from .plans import pricing_payload
from .search import choices_payload, search_candidates, search_jobs
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationNotesSerializer,
    ApplicationStatusSerializer,
    BulkStatusSerializer,
    CandidateApplicationSerializer,
    CandidateCardSerializer,
    CandidateFullSerializer,
    CandidateOwnerSerializer,
    ChatMessageSerializer,
    ChatSendSerializer,
    ChatThreadSerializer,
    CheckoutSerializer,
    DirectThreadSerializer,
    EmployerApplicationSerializer,
    EmployerOwnerSerializer,
    EmployerPublicSerializer,
    JobListingDetailSerializer,
    JobListingListSerializer,
    JobListingWriteSerializer,
    JobPaymentSerializer,
    SavedSearchSerializer,
)
from .services import (
    AlertService,
    AnalyticsService,
    ApplicationService,
    ChatService,
    EntitlementService,
    JobsError,
    JobService,
    PaymentService,
    ProfileService,
)

logger = logging.getLogger(__name__)


class JobsErrorMixin:
    """Turn JobsError into a clean JSON response with a machine-readable code."""

    def handle_exception(self, exc):
        if isinstance(exc, JobsError):
            detail = exc.args[0] if exc.args else "Something went wrong."
            if isinstance(detail, dict):
                body = {"detail": "Please fix the highlighted fields.", "errors": detail,
                        "code": exc.code}
            else:
                body = {"detail": str(detail), "code": exc.code}
            return Response(body, status=exc.status)
        return super().handle_exception(exc)


def _user_job_context(request) -> dict:
    """saved/applied ids so list cards can show a filled bookmark / 'Applied'."""
    user = request.user
    if not user.is_authenticated:
        return {}
    return {
        "saved_ids": {str(i) for i in SavedJob.objects.filter(user=user)
                      .values_list("job_id", flat=True)},
        "applied_ids": {str(i) for i in JobApplication.objects.filter(candidate__user=user)
                        .values_list("job_id", flat=True)},
    }


# --------------------------------------------------------------------------- #
# Meta
# --------------------------------------------------------------------------- #

class MetaView(APIView):
    """GET /jobs/meta/ — enum choices + pricing for forms and filter UIs."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"choices": choices_payload(), "pricing": pricing_payload()})


# --------------------------------------------------------------------------- #
# Employers
# --------------------------------------------------------------------------- #

class EmployerViewSet(JobsErrorMixin, viewsets.GenericViewSet):
    """
    GET  /jobs/employers/<slug>/        public company page
    GET  /jobs/employers/<slug>/jobs/   its live jobs
    GET|POST|PATCH /jobs/employers/me/  my company profile
    POST /jobs/employers/me/verification/  submit documents for review
    """
    lookup_field = "slug"
    serializer_class = EmployerPublicSerializer

    def get_queryset(self):
        return EmployerProfile.objects.filter(is_active=True).annotate(
            active_jobs_count=Count("jobs", filter=Q(jobs__status=JobListing.Status.ACTIVE,
                                                     jobs__expires_at__gt=timezone.now())))

    def get_permissions(self):
        if self.action in ("retrieve", "jobs"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def retrieve(self, request, slug=None):
        return Response(EmployerPublicSerializer(self.get_object()).data)

    @action(detail=True, methods=["get"])
    def jobs(self, request, slug=None):
        employer = self.get_object()
        qs = JobListing.objects.live().filter(employer=employer).select_related("employer") \
            .promoted_first().order_by("promo_rank", "-published_at")
        page = self.paginate_queryset(qs)
        data = JobListingListSerializer(page, many=True, context=_user_job_context(request)).data
        return self.get_paginated_response(data)

    @action(detail=False, methods=["get", "post", "patch"], url_path="me")
    def me(self, request):
        employer = ProfileService.employer_for(request.user)
        if request.method == "GET":
            if employer is None:
                return Response({"detail": "No company profile yet.",
                                 "code": "no_employer_profile"}, status=404)
            return Response({**EmployerOwnerSerializer(employer).data,
                             "usage": EntitlementService.usage(employer)})
        if request.method == "POST" and employer is not None:
            return Response({"detail": "You already have a company profile."}, status=400)
        if request.method == "PATCH" and employer is None:
            return Response({"detail": "No company profile yet.",
                             "code": "no_employer_profile"}, status=404)
        s = EmployerOwnerSerializer(employer, data=request.data,
                                    partial=request.method == "PATCH")
        s.is_valid(raise_exception=True)
        employer = s.save(owner=request.user) if employer is None else s.save()
        ProfileService.subscription(employer)
        return Response(EmployerOwnerSerializer(employer).data,
                        status=201 if request.method == "POST" else 200)

    @action(detail=False, methods=["post"], url_path="me/verification")
    def verification(self, request):
        employer = ProfileService.require_employer(request.user)
        if employer.is_verified:
            return Response({"detail": "Already verified."})
        doc = (request.data.get("verification_document_url") or "").strip()
        reg = (request.data.get("registration_number") or "").strip()
        if not doc:
            raise JobsError({"verification_document_url": "Upload a registration document."})
        employer.verification_document_url = doc
        employer.registration_number = reg or employer.registration_number
        employer.verification_status = EmployerProfile.Verification.PENDING
        employer.save(update_fields=["verification_document_url", "registration_number",
                                     "verification_status", "updated_at"])
        return Response(EmployerOwnerSerializer(employer).data)


# --------------------------------------------------------------------------- #
# Candidates
# --------------------------------------------------------------------------- #

class CandidateViewSet(JobsErrorMixin, viewsets.GenericViewSet):
    """
    GET|PUT|PATCH /jobs/candidates/me/   my CV/profile (created on first GET)
    GET  /jobs/candidates/?q=&skills=    employer candidate-database search (plan-gated)
    GET  /jobs/candidates/<id>/          full profile (counts against view quota)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateOwnerSerializer
    queryset = CandidateProfile.objects.select_related("user")

    @action(detail=False, methods=["get", "put", "patch"], url_path="me")
    def me(self, request):
        profile = ProfileService.candidate_for(request.user, create=True)
        if request.method == "GET":
            return Response(CandidateOwnerSerializer(profile).data)
        s = CandidateOwnerSerializer(profile, data=request.data,
                                     partial=request.method == "PATCH")
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)

    @action(detail=False, methods=["get"], url_path="me/dashboard")
    def dashboard(self, request):
        profile = ProfileService.candidate_for(request.user, create=True)
        return Response(AnalyticsService.candidate_dashboard(profile))

    def list(self, request):
        employer = ProfileService.require_employer(request.user)
        EntitlementService.require_feature(
            employer, "candidate_search", "Candidate search is available on Premium and Pro.")
        qs = search_candidates(request.query_params).exclude(user=request.user)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(CandidateCardSerializer(page, many=True).data)

    def retrieve(self, request, pk=None):
        candidate = get_object_or_404(self.get_queryset(), pk=pk)
        if candidate.user_id == request.user.id:
            return Response(CandidateOwnerSerializer(candidate).data)
        employer = ProfileService.require_employer(request.user)
        applied = JobApplication.objects.filter(candidate=candidate,
                                                job__employer=employer).exists()
        if not applied:
            if not candidate.is_searchable:
                return Response({"detail": "Not found."}, status=404)
            EntitlementService.record_candidate_view(employer, candidate)
        return Response(CandidateFullSerializer(candidate).data)


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #

class JobListingViewSet(JobsErrorMixin, viewsets.ModelViewSet):
    """
    Public:    GET /jobs/listings/?q=&location_type=remote,hybrid&salary_min=…
               GET /jobs/listings/<id>/   GET /jobs/listings/by-slug/<slug>/
    Candidate: GET /jobs/listings/recommended/   GET /jobs/listings/saved/
               POST|DELETE /jobs/listings/<id>/save/   POST /jobs/listings/<id>/report/
    Employer:  POST /jobs/listings/   PATCH/DELETE /jobs/listings/<id>/
               GET /jobs/listings/mine/
               POST /jobs/listings/<id>/{publish,pause,resume,close,renew,feature}/
               GET  /jobs/listings/<id>/{applications,matches,analytics}/
    """
    public_actions = ("list", "retrieve", "by_slug")

    def get_permissions(self):
        if self.action in self.public_actions:
            return [AllowAny()]
        if self.action in ("create", "mine"):
            return [IsAuthenticated(), IsEmployer()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update", "mine"):
            return JobListingWriteSerializer
        if self.action in ("retrieve", "by_slug"):
            return JobListingDetailSerializer
        return JobListingListSerializer

    def get_queryset(self):
        base = JobListing.objects.select_related("employer", "employer__subscription")
        if self.action in self.public_actions:
            if self.request.user.is_authenticated:
                # owners can preview their own drafts through the public endpoint
                return base.filter(Q(pk__in=JobListing.objects.live().values("pk"))
                                   | Q(employer__owner=self.request.user))
            return base.filter(pk__in=JobListing.objects.live().values("pk"))
        if self.action in ("toggle_save", "report"):
            return base.filter(pk__in=JobListing.objects.live().values("pk"))
        return base.filter(employer__owner=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.action in ("list", "retrieve", "by_slug", "recommended", "saved"):
            ctx.update(_user_job_context(self.request))
        return ctx

    # ---- public ------------------------------------------------------------ #

    def list(self, request, *args, **kwargs):
        qs, fs = search_jobs(request.query_params)
        if fs.errors:
            return Response({"detail": "Invalid filters.", "errors": fs.errors}, status=400)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def _detail(self, request, job):
        JobService.record_view(job, request.user)
        ctx = self.get_serializer_context()
        candidate = ProfileService.candidate_for(request.user)
        if candidate and job.employer.owner_id != request.user.id:
            ctx["match"] = score(candidate, job)
        return Response(JobListingDetailSerializer(job, context=ctx).data)

    def retrieve(self, request, *args, **kwargs):
        return self._detail(request, self.get_object())

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[-\w]+)")
    def by_slug(self, request, slug=None):
        return self._detail(request, get_object_or_404(self.get_queryset(), slug=slug))

    # ---- employer CRUD ------------------------------------------------------ #

    def perform_create(self, serializer):
        employer = ProfileService.require_employer(self.request.user)
        job = serializer.save(employer=employer, posted_by=self.request.user)
        if str(self.request.data.get("publish", "")).lower() in ("1", "true"):
            JobService.publish(job, self.request.user)

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        self.perform_create(s)
        s.instance.refresh_from_db()
        return Response(JobListingWriteSerializer(s.instance).data, status=201)

    def perform_update(self, serializer):
        job = serializer.save()
        if job.status in (JobListing.Status.ACTIVE, JobListing.Status.PENDING_REVIEW):
            from .moderation import screen
            from .search import refresh_search_vector
            refresh_search_vector([job.pk])
            verdict = screen(job)
            if verdict["hold"] and job.status == JobListing.Status.ACTIVE:
                job.status = JobListing.Status.PENDING_REVIEW
                job.moderation_note = "; ".join(verdict["reasons"])[:255]
                job.save(update_fields=["status", "moderation_note", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        if job.applications.exists():
            JobService.close(job)       # keep applicants' history intact
            return Response(JobListingWriteSerializer(job).data)
        job.delete()
        return Response(status=204)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = self.get_queryset().order_by("-created_at")
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status__in=st.split(","))
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(JobListingWriteSerializer(page, many=True).data)

    def _act(self, fn, *args):
        job = self.get_object()
        job = fn(job, *args) or job
        job.refresh_from_db()
        return Response(JobListingWriteSerializer(job).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        return self._act(JobService.publish, request.user)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        return self._act(JobService.pause)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        return self._act(JobService.resume, request.user)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return self._act(JobService.close)

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        return self._act(JobService.renew, request.user)

    @action(detail=True, methods=["post"])
    def feature(self, request, pk=None):
        on = str(request.data.get("on", "true")).lower() in ("1", "true")
        return self._act(JobService.set_featured, on)

    @action(detail=True, methods=["get"])
    def applications(self, request, pk=None):
        job = self.get_object()
        qs = job.applications.select_related("candidate__user", "job", "thread") \
            .order_by("-match_score", "created_at")
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status__in=st.split(","))
        ctx = {"unlocked_ids": EntitlementService.unlocked_application_ids(job)}
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            EmployerApplicationSerializer(page, many=True, context=ctx).data)

    @action(detail=True, methods=["get"])
    def matches(self, request, pk=None):
        job = self.get_object()
        EntitlementService.require_feature(job.employer, "smart_matching",
                                           "Smart candidate matching is a Premium feature.")
        out = []
        for candidate, detail in recommend_candidates_for(job, limit=20):
            out.append({**CandidateCardSerializer(candidate).data, "match": detail})
        return Response({"results": out})

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        job = self.get_object()
        return Response(AnalyticsService.job_analytics(job))

    # ---- candidate ---------------------------------------------------------- #

    @action(detail=False, methods=["get"])
    def recommended(self, request):
        candidate = ProfileService.candidate_for(request.user, create=True)
        ranked = recommend_jobs_for(candidate, limit=int(request.query_params.get("limit", 20)))
        ctx = self.get_serializer_context()
        return Response({"results": [
            {**JobListingListSerializer(job, context=ctx).data, "match": detail}
            for job, detail in ranked]})

    @action(detail=False, methods=["get"])
    def saved(self, request):
        qs = JobListing.objects.filter(saves__user=request.user).select_related("employer") \
            .order_by("-saves__created_at")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            JobListingListSerializer(page, many=True, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post", "delete"], url_path="save")
    def toggle_save(self, request, pk=None):
        if request.method == "DELETE":
            SavedJob.objects.filter(user=request.user, job_id=pk).delete()
            return Response({"saved": False})
        job = self.get_object()
        SavedJob.objects.get_or_create(user=request.user, job=job)
        return Response({"saved": True})

    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        job = self.get_object()
        reason = (request.data.get("reason") or "").strip()[:500]
        if not reason:
            raise JobsError({"reason": "Tell us what's wrong with this listing."})
        if not JobFlag.objects.filter(job=job, reported_by=request.user, resolved=False).exists():
            JobFlag.objects.create(job=job, kind=JobFlag.Kind.REPORTED, reason=reason,
                                   reported_by=request.user, score=30)
            reports = JobFlag.objects.filter(job=job, kind=JobFlag.Kind.REPORTED,
                                             resolved=False).count()
            if reports >= 3:
                JobListing.objects.filter(pk=job.pk).update(is_flagged=True)
        return Response({"detail": "Thanks — our team will review this listing."})


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

class ApplicationViewSet(JobsErrorMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                         viewsets.GenericViewSet):
    """
    Candidate: POST /jobs/applications/ {job, cover_letter?, answers?}  (1-click apply)
               GET  /jobs/applications/            my applications + status timeline
               POST /jobs/applications/<id>/withdraw/
    Employer:  GET  /jobs/applications/?as=employer&job=&status=
               GET  /jobs/applications/pipeline/?job=<id>     kanban columns
               POST /jobs/applications/<id>/status/ {status, note?, interview_at?}
               POST /jobs/applications/bulk-status/ {ids, status}
               PATCH /jobs/applications/<id>/notes/ {employer_rating, employer_notes}
    Both:      POST /jobs/applications/<id>/thread/  open (or fetch) the chat thread
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateApplicationSerializer

    def _as_employer(self):
        return self.request.query_params.get("as") == "employer"

    def get_queryset(self):
        user = self.request.user
        qs = JobApplication.objects.select_related(
            "job__employer", "candidate__user", "thread"
        ).prefetch_related("events")
        employer_scope = (self.action in ("pipeline", "bulk_status")
                          or (self.action == "list" and self._as_employer()))
        if employer_scope:
            qs = qs.filter(job__employer__owner=user)
            if self.request.query_params.get("job"):
                qs = qs.filter(job_id=self.request.query_params["job"])
            return qs
        if self.action == "list":
            return qs.filter(candidate__user=user)
        return qs.filter(Q(candidate__user=user) | Q(job__employer__owner=user))

    def get_permissions(self):
        perms = super().get_permissions()
        if self.action in ("retrieve", "status", "withdraw", "notes", "thread"):
            perms.append(IsApplicationParticipant())
        return perms

    def _serialize(self, app, many=False):
        user = self.request.user
        if many:
            employer_side = self._as_employer()
        else:
            employer_side = app.job.employer.owner_id == user.id
        if employer_side:
            unlocked = None
            if not many:
                unlocked = EntitlementService.unlocked_application_ids(app.job)
            return EmployerApplicationSerializer(app, many=many,
                                                 context={"unlocked_ids": unlocked}).data
        return CandidateApplicationSerializer(app, many=many).data

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status__in=st.split(","))
        page = self.paginate_queryset(qs.order_by("-created_at"))
        return self.get_paginated_response(self._serialize(page, many=True))

    def retrieve(self, request, *args, **kwargs):
        app = self.get_object()
        app = ApplicationService.mark_viewed(app, request.user)
        return Response(self._serialize(app))

    def create(self, request):
        s = ApplicationCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        job = get_object_or_404(JobListing.objects.select_related("employer__owner"),
                                pk=s.validated_data["job"])
        d = s.validated_data
        has_extra = bool(d.get("cover_letter") or d.get("answers"))
        app = ApplicationService.apply(
            user=request.user, job=job, cover_letter=d.get("cover_letter", ""),
            answers=d.get("answers"), expected_salary=d.get("expected_salary"),
            cv_url=d.get("cv_url", ""),
            source=JobApplication.Source.FORM if has_extra else JobApplication.Source.ONE_CLICK)
        return Response(CandidateApplicationSerializer(app).data, status=201)

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        job_id = request.query_params.get("job")
        if not job_id:
            raise JobsError({"job": "Pass ?job=<id>."})
        job = get_object_or_404(JobListing, pk=job_id, employer__owner=request.user)
        unlocked = EntitlementService.unlocked_application_ids(job)
        apps = list(self.get_queryset().order_by("-match_score", "created_at"))
        columns = []
        for st in PIPELINE:
            items = [a for a in apps if a.status == st]
            columns.append({
                "status": st, "label": ApplicationStatus(st).label, "count": len(items),
                "results": EmployerApplicationSerializer(
                    items, many=True, context={"unlocked_ids": unlocked}).data,
            })
        locked = 0 if unlocked is None else max(0, len(apps) - len(unlocked))
        return Response({"job": {"id": str(job.id), "title": job.title},
                         "columns": columns, "locked_count": locked})

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        app = self.get_object()
        s = ApplicationStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        if app.job.employer.owner_id == request.user.id:
            unlocked = EntitlementService.unlocked_application_ids(app.job)
            if unlocked is not None and app.id not in unlocked:
                raise JobsError("Upgrade your plan to manage this applicant.",
                                code="upgrade_required", status=402)
        app = ApplicationService.transition(
            app, d["status"], actor=request.user, note=d.get("note", ""),
            interview_at=d.get("interview_at"), rejection_reason=d.get("rejection_reason", ""))
        return Response(self._serialize(app))

    @action(detail=False, methods=["post"], url_path="bulk-status")
    def bulk_status(self, request):
        employer = ProfileService.require_employer(request.user)
        s = BulkStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        return Response(ApplicationService.bulk_transition(
            employer=employer, ids=d["ids"], to_status=d["status"], actor=request.user,
            note=d.get("note", "")))

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        app = ApplicationService.withdraw(self.get_object(), request.user)
        return Response(CandidateApplicationSerializer(app).data)

    @action(detail=True, methods=["patch"])
    def notes(self, request, pk=None):
        app = self.get_object()
        if app.job.employer.owner_id != request.user.id:
            return Response({"detail": "Only the employer can add notes."}, status=403)
        s = ApplicationNotesSerializer(app, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(self._serialize(app))

    @action(detail=True, methods=["post"])
    def thread(self, request, pk=None):
        thread = ChatService.for_application(self.get_object(), request.user)
        return Response(ChatThreadSerializer(thread, context={"request": request}).data)


# --------------------------------------------------------------------------- #
# Saved searches
# --------------------------------------------------------------------------- #

class SavedSearchViewSet(JobsErrorMixin, viewsets.ModelViewSet):
    """CRUD /jobs/saved-searches/  +  GET /jobs/saved-searches/<id>/run/"""
    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"])
    def run(self, request, pk=None):
        saved = self.get_object()
        qs, _ = search_jobs(AlertService.params_for(saved))
        SavedSearch.objects.filter(pk=saved.pk).update(last_run_at=timezone.now())
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            JobListingListSerializer(page, many=True, context=_user_job_context(request)).data)


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #

class ChatThreadViewSet(JobsErrorMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                        viewsets.GenericViewSet):
    """
    GET  /jobs/threads/                      my conversations
    GET  /jobs/threads/<id>/messages/?before=<iso>&limit=50
    POST /jobs/threads/<id>/messages/ {body, attachment?: {url,name,type,size}, client_id?}
    POST /jobs/threads/<id>/read/
    POST /jobs/threads/direct/ {candidate, job?, body?}   (Pro employers)

    Sending also works over the WebSocket; both paths call ChatService.send.
    """
    serializer_class = ChatThreadSerializer
    permission_classes = [IsAuthenticated, IsThreadParticipant]

    def get_queryset(self):
        return ChatService.threads_for(self.request.user)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        thread = self.get_object()
        if request.method == "POST":
            s = ChatSendSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            msg = ChatService.send(thread, request.user, body=s.validated_data.get("body", ""),
                                   attachment=s.validated_data.get("attachment"),
                                   client_id=s.validated_data.get("client_id", ""))
            return Response(ChatMessageSerializer(msg).data, status=201)

        limit = min(int(request.query_params.get("limit", 50)), 100)
        qs = thread.messages.select_related("sender").order_by("-created_at")
        before = parse_datetime(request.query_params.get("before") or "")
        if before:
            qs = qs.filter(created_at__lt=before)
        rows = list(qs[: limit + 1])
        has_more = len(rows) > limit
        rows = list(reversed(rows[:limit]))
        return Response({"results": ChatMessageSerializer(rows, many=True).data,
                         "has_more": has_more})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        ChatService.mark_read(self.get_object(), request.user)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsEmployer])
    def direct(self, request):
        employer = ProfileService.require_employer(request.user)
        s = DirectThreadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        candidate = get_object_or_404(CandidateProfile, pk=s.validated_data["candidate"])
        job = None
        if s.validated_data.get("job"):
            job = get_object_or_404(JobListing, pk=s.validated_data["job"], employer=employer)
        thread = ChatService.open_direct(employer=employer, candidate=candidate,
                                         user=request.user, job=job)
        if s.validated_data.get("body"):
            ChatService.send(thread, request.user, body=s.validated_data["body"])
        return Response(ChatThreadSerializer(thread, context={"request": request}).data,
                        status=201)


# --------------------------------------------------------------------------- #
# Dashboards
# --------------------------------------------------------------------------- #

class EmployerDashboardView(JobsErrorMixin, APIView):
    """GET /jobs/dashboard/employer/?days=30 — recruitment analytics (Premium+)."""
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        employer = ProfileService.require_employer(request.user)
        days = max(7, min(int(request.query_params.get("days", 30)), 180))
        plan = EntitlementService.plan(employer)
        data = AnalyticsService.employer_dashboard(employer, days=days)
        if not plan.analytics:
            # free plan: headline numbers only, charts behind the upgrade
            data = {"jobs": data["jobs"], "applications": {"total": data["applications"]["total"]},
                    "locked": True, "code": "upgrade_required"}
        data["usage"] = EntitlementService.usage(employer)
        return Response(data)


# --------------------------------------------------------------------------- #
# Billing
# --------------------------------------------------------------------------- #

class PlansView(APIView):
    """GET /jobs/billing/plans/ — public pricing."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(pricing_payload())


class SubscriptionView(JobsErrorMixin, APIView):
    """GET /jobs/billing/subscription/ — current plan + usage against limits."""
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        employer = ProfileService.require_employer(request.user)
        return Response(EntitlementService.usage(employer))


class CheckoutView(JobsErrorMixin, APIView):
    """
    POST /jobs/billing/checkout/
      {purpose: "plan", plan: "premium"|"pro", currency?}
      {purpose: "job_credit", quantity: 1..20, currency?}
      {purpose: "boost", job: <id>, days: 7|30, currency?}
    → {reference, authorization_url, amount, currency}. Open the URL, then
      POST /jobs/billing/verify/ {reference} when the user returns.
    """
    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        from apps.common.permissions import IsVerified
        if not IsVerified().has_permission(request, self):
            return Response({"detail": IsVerified.message, "code": "unverified"}, status=403)
        employer = ProfileService.require_employer(request.user)
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        job = None
        if d.get("job"):
            job = get_object_or_404(JobListing, pk=d["job"], employer=employer)
        payment = PaymentService.initiate(
            user=request.user, employer=employer, purpose=d["purpose"],
            plan=(d.get("plan") or "").lower(), quantity=d.get("quantity") or 1,
            days=d.get("days") or 0, job=job, currency=d.get("currency") or "NGN")
        return Response(JobPaymentSerializer(payment).data, status=201)


class VerifyPaymentView(JobsErrorMixin, APIView):
    """POST /jobs/billing/verify/ {reference}"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reference = (request.data.get("reference") or "").strip()
        if not reference:
            raise JobsError({"reference": "reference is required."})
        payment = PaymentService.verify(user=request.user, reference=reference)
        employer = payment.employer
        return Response({**JobPaymentSerializer(payment).data,
                         "usage": EntitlementService.usage(employer)})


class PaymentHistoryView(APIView):
    """GET /jobs/billing/payments/"""
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        qs = JobPayment.objects.filter(employer__owner=request.user).select_related("job")[:100]
        return Response(JobPaymentSerializer(qs, many=True).data)


class JobsPaymentWebhookView(APIView):
    """
    POST /jobs/billing/webhook/ — optional dedicated webhook. The main
    /payments/webhook/* receivers also forward JOB- references here (see
    apply_jobs_backend.py), so either URL works. We never trust the payload:
    activation re-verifies the charge with the gateway.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.conf import settings

        from integrations.base import ProviderFactory
        headers = {k.lower(): v for k, v in request.headers.items()}
        provider = ("flutterwave" if headers.get("verif-hash")
                    else settings.DEFAULT_PROVIDERS.get("payments", "paystack"))
        try:
            gateway = ProviderFactory.get("payments", provider)
            verify = getattr(gateway, "verify_webhook", None)
            if verify and not verify(request.body, headers):
                return Response({"detail": "Invalid signature."}, status=403)
        except Exception:
            logger.exception("jobs webhook: gateway unavailable")
            return Response({"status": "ignored"})
        try:
            payload = json.loads(request.body or b"{}")
        except ValueError:
            payload = {}
        data = payload.get("data", {}) or {}
        reference = data.get("reference") or data.get("tx_ref") or ""
        PaymentService.activate_by_reference(reference)
        return Response({"status": "ok"})


class MaintenanceTriggerView(APIView):
    """
    POST /jobs/internal/maintenance/   header  X-Cron-Secret: <JOBS_CRON_SECRET>

    Runs the same housekeeping as `manage.py jobs_maintenance`, for hosts where
    a cron service costs extra (Render cron jobs need a paid plan). Point any
    free scheduler (e.g. cron-job.org) at it every 15 minutes.

    Disabled (404) until JOBS_CRON_SECRET is set, so it can't be poked at by
    anyone who guesses the URL.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        import hmac
        import os

        from django.conf import settings
        secret = getattr(settings, "JOBS_CRON_SECRET", "") or os.environ.get("JOBS_CRON_SECRET", "")
        given = request.headers.get("X-Cron-Secret", "")
        if not secret:
            return Response({"detail": "Not found."}, status=404)
        if not hmac.compare_digest(given.encode(), secret.encode()):
            return Response({"detail": "Forbidden."}, status=403)

        from .matching import build_idf
        from .services import AlertService, MaintenanceService
        only = set(filter(None, (request.query_params.get("only") or "").split(","))) or {
            "expire", "alerts", "flags", "reminders", "matching"}
        out = {}
        steps = {
            "expire": lambda: {"listings": MaintenanceService.expire_listings(),
                               "promotions": MaintenanceService.expire_promotions()},
            "alerts": AlertService.send_due_digests,
            "flags": MaintenanceService.rescan_recent,
            "reminders": MaintenanceService.subscription_reminders,
            "matching": lambda: len(build_idf(force=True)),
        }
        for name, fn in steps.items():
            if name not in only:
                continue
            try:
                out[name] = fn()
            except Exception as exc:  # one failing step mustn't skip the rest
                logger.exception("jobs maintenance step %s failed", name)
                out[name] = {"error": str(exc)}
        return Response({"ok": True, "ran": out})
