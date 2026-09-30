"""
Serializers. Two rules run through this file:

1. Employer-private fields (notes, rating, rejection reason) are never sent to
   candidates, and candidate contact details are never sent to employers who
   haven't earned them (an application, or a database view on their plan).
2. Status/ownership fields are read-only — they only change through services.
"""
from __future__ import annotations

from rest_framework import serializers

from .models import (
    ApplicationStatus,
    ApplicationStatusEvent,
    CandidateProfile,
    ChatMessage,
    ChatThread,
    EmployerProfile,
    JobApplication,
    JobListing,
    JobPayment,
    SavedSearch,
)


def _name(user) -> str:
    if user is None:
        return ""
    full = f"{user.first_name} {user.last_name}".strip()
    return full or (user.email or "").split("@")[0] or "OAM user"


# --------------------------------------------------------------------------- #
# Employers
# --------------------------------------------------------------------------- #

class EmployerPublicSerializer(serializers.ModelSerializer):
    is_verified = serializers.BooleanField(read_only=True)
    active_jobs = serializers.SerializerMethodField()

    class Meta:
        model = EmployerProfile
        fields = ["id", "company_name", "slug", "tagline", "description", "industry",
                  "company_size", "website", "headquarters", "country", "logo_url",
                  "cover_url", "brand_color", "is_verified", "active_jobs"]
        read_only_fields = fields

    def get_active_jobs(self, obj):
        return getattr(obj, "active_jobs_count", None)


class EmployerMiniSerializer(serializers.ModelSerializer):
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = EmployerProfile
        fields = ["id", "company_name", "slug", "logo_url", "brand_color", "is_verified"]
        read_only_fields = fields


class EmployerOwnerSerializer(serializers.ModelSerializer):
    """What the owner sees and edits on their own company page."""
    is_verified = serializers.BooleanField(read_only=True)
    subscription_tier = serializers.CharField(read_only=True)

    class Meta:
        model = EmployerProfile
        fields = ["id", "company_name", "slug", "tagline", "description", "industry",
                  "company_size", "website", "contact_email", "headquarters", "country",
                  "logo_url", "cover_url", "brand_color", "verification_status",
                  "is_verified", "registration_number", "verification_document_url",
                  "verification_note", "verified_at", "subscription_tier", "created_at"]
        read_only_fields = ["id", "slug", "verification_status", "is_verified",
                            "verification_note", "verified_at", "subscription_tier",
                            "created_at"]

    def validate_brand_color(self, value):
        import re
        if value and not re.fullmatch(r"#[0-9A-Fa-f]{6}", value):
            raise serializers.ValidationError("Use a hex colour like #0F766E.")
        return value

    def validate_country(self, value):
        return (value or "").upper()


# --------------------------------------------------------------------------- #
# Candidates
# --------------------------------------------------------------------------- #

class CandidateOwnerSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    completeness = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta:
        model = CandidateProfile
        fields = ["id", "display_name", "email", "phone", "headline", "summary", "cv_url",
                  "cv_filename", "cv_updated_at", "photo_url", "skills", "years_experience",
                  "experience_level", "experience", "education", "languages", "links",
                  "location", "country", "desired_titles", "desired_categories",
                  "desired_location_types", "desired_employment_types", "desired_salary_min",
                  "desired_salary_currency", "desired_salary_period", "willing_to_relocate",
                  "open_to_work", "is_searchable", "completeness", "updated_at"]
        read_only_fields = ["id", "display_name", "email", "phone", "cv_updated_at",
                            "completeness", "updated_at"]

    def validate_skills(self, value):
        if not isinstance(value, list) or not all(isinstance(s, str) for s in value):
            raise serializers.ValidationError("Send skills as a list of names.")
        return value[:50]

    def _list_of(self, value, allowed, label):
        if not isinstance(value, list) or any(v not in allowed for v in value):
            raise serializers.ValidationError(f"Invalid {label}.")
        return value

    def validate_desired_location_types(self, v):
        from .models import LocationType
        return self._list_of(v, LocationType.values, "location type")

    def validate_desired_employment_types(self, v):
        from .models import EmploymentType
        return self._list_of(v, EmploymentType.values, "employment type")

    def validate_desired_categories(self, v):
        from .models import JobCategory
        return self._list_of(v, JobCategory.values, "category")

    def validate_country(self, value):
        return (value or "").upper()

    def update(self, instance, validated):
        from django.utils import timezone
        if "cv_url" in validated and validated["cv_url"] != instance.cv_url:
            instance.cv_updated_at = timezone.now()
        return super().update(instance, validated)


class CandidateCardSerializer(serializers.ModelSerializer):
    """Search-result card for employers: no contact details, no CV link."""
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = ["id", "display_name", "headline", "photo_url", "skills", "years_experience",
                  "experience_level", "location", "country", "open_to_work",
                  "desired_location_types", "updated_at"]
        read_only_fields = fields


class CandidateFullSerializer(CandidateCardSerializer):
    """Full profile — shown to employers after an application or a quota'd view."""
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta(CandidateCardSerializer.Meta):
        fields = CandidateCardSerializer.Meta.fields + [
            "summary", "cv_url", "cv_filename", "experience", "education", "languages",
            "links", "desired_employment_types", "email", "phone"]
        read_only_fields = fields


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #

class JobListingListSerializer(serializers.ModelSerializer):
    employer = EmployerMiniSerializer(read_only=True)
    is_promoted = serializers.BooleanField(read_only=True)
    is_saved = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()
    salary = serializers.SerializerMethodField()

    class Meta:
        model = JobListing
        fields = ["id", "slug", "title", "employer", "category", "employment_type",
                  "experience_level", "location_type", "location", "country", "salary",
                  "skills", "is_promoted", "is_featured", "is_boosted", "published_at",
                  "expires_at", "apply_method", "is_saved", "has_applied"]
        read_only_fields = fields

    def get_salary(self, obj):
        if not obj.salary_visible or (obj.salary_min is None and obj.salary_max is None):
            return None
        return {"min": obj.salary_min, "max": obj.salary_max,
                "currency": obj.salary_currency, "period": obj.salary_period}

    def get_is_saved(self, obj):
        ids = self.context.get("saved_ids")
        return str(obj.id) in ids if ids is not None else None

    def get_has_applied(self, obj):
        ids = self.context.get("applied_ids")
        return str(obj.id) in ids if ids is not None else None


class JobListingDetailSerializer(JobListingListSerializer):
    employer = EmployerPublicSerializer(read_only=True)
    match = serializers.SerializerMethodField()

    class Meta(JobListingListSerializer.Meta):
        fields = JobListingListSerializer.Meta.fields + [
            "description", "responsibilities", "requirements", "benefits",
            "screening_questions", "min_years_experience", "openings", "external_apply_url",
            "views_count", "applications_count", "status", "match"]
        read_only_fields = fields

    def get_match(self, obj):
        return self.context.get("match")


class JobListingWriteSerializer(serializers.ModelSerializer):
    """Employer create/update. Status changes go through the action endpoints."""

    class Meta:
        model = JobListing
        fields = ["id", "title", "description", "responsibilities", "requirements", "benefits",
                  "skills", "screening_questions", "category", "employment_type",
                  "experience_level", "min_years_experience", "location_type", "location",
                  "country", "salary_min", "salary_max", "salary_currency", "salary_period",
                  "salary_visible", "apply_method", "external_apply_url", "openings",
                  # read-only extras for the owner
                  "slug", "status", "published_at", "expires_at", "is_featured",
                  "featured_until", "is_boosted", "boosted_until", "posted_with_credit",
                  "views_count", "applications_count", "is_flagged", "moderation_note",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "status", "published_at", "expires_at", "is_featured",
                            "featured_until", "is_boosted", "boosted_until",
                            "posted_with_credit", "views_count", "applications_count",
                            "is_flagged", "moderation_note", "created_at", "updated_at"]

    def validate_skills(self, value):
        if not isinstance(value, list) or not all(isinstance(s, str) for s in value):
            raise serializers.ValidationError("Send skills as a list of names.")
        return value

    def validate_screening_questions(self, value):
        if not isinstance(value, list) or len(value) > 10:
            raise serializers.ValidationError("Up to 10 screening questions.")
        clean = []
        for i, q in enumerate(value):
            if not isinstance(q, dict) or not str(q.get("question", "")).strip():
                raise serializers.ValidationError("Each question needs text.")
            clean.append({"id": str(q.get("id") or i + 1),
                          "question": str(q["question"]).strip()[:300],
                          "required": bool(q.get("required", False))})
        return clean

    def validate_salary_currency(self, value):
        return (value or "NGN").upper()

    def validate_country(self, value):
        return (value or "").upper()

    def validate(self, attrs):
        lo = attrs.get("salary_min", getattr(self.instance, "salary_min", None))
        hi = attrs.get("salary_max", getattr(self.instance, "salary_max", None))
        if lo is not None and hi is not None and lo > hi:
            raise serializers.ValidationError({"salary_max": "Must be at least the minimum."})
        return attrs


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

class StatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStatusEvent
        fields = ["from_status", "to_status", "note", "created_at"]
        read_only_fields = fields


class ApplicationCreateSerializer(serializers.Serializer):
    job = serializers.UUIDField()
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    answers = serializers.ListField(child=serializers.DictField(), required=False)
    expected_salary = serializers.DecimalField(max_digits=14, decimal_places=2,
                                               required=False, allow_null=True)
    cv_url = serializers.URLField(required=False, allow_blank=True)


class CandidateApplicationSerializer(serializers.ModelSerializer):
    """What a candidate sees about their own application."""
    job = JobListingListSerializer(read_only=True)
    events = StatusEventSerializer(many=True, read_only=True)
    thread_id = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = ["id", "job", "status", "status_changed_at", "source", "cover_letter",
                  "cv_url", "answers", "expected_salary", "match_score", "match_details",
                  "interview_at", "events", "thread_id", "created_at"]
        read_only_fields = fields

    def get_thread_id(self, obj):
        thread = getattr(obj, "thread", None)
        return str(thread.id) if thread else None


class EmployerApplicationSerializer(serializers.ModelSerializer):
    """
    What an employer sees in the pipeline. When `locked` (free plan, beyond
    the applicant cap) the candidate is reduced to a placeholder.
    """
    candidate = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    thread_id = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = ["id", "job", "candidate", "status", "status_changed_at", "source",
                  "cover_letter", "cv_url", "answers", "expected_salary", "match_score",
                  "match_details", "employer_rating", "employer_notes", "interview_at",
                  "rejection_reason", "viewed_by_employer_at", "locked", "thread_id",
                  "created_at"]
        read_only_fields = fields

    def _locked(self, obj):
        unlocked = self.context.get("unlocked_ids")
        return unlocked is not None and obj.id not in unlocked

    def get_locked(self, obj):
        return self._locked(obj)

    def get_job(self, obj):
        return {"id": str(obj.job_id), "title": obj.job.title}

    def get_candidate(self, obj):
        if self._locked(obj):
            return {"id": None, "display_name": "Upgrade to view this applicant"}
        return CandidateFullSerializer(obj.candidate).data

    def get_thread_id(self, obj):
        thread = getattr(obj, "thread", None)
        return str(thread.id) if thread else None

    def to_representation(self, obj):
        data = super().to_representation(obj)
        if data["locked"]:
            for k in ("cover_letter", "cv_url", "answers", "expected_salary", "match_details"):
                data[k] = None
        return data


class ApplicationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ApplicationStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
    interview_at = serializers.DateTimeField(required=False, allow_null=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class BulkStatusSerializer(ApplicationStatusSerializer):
    ids = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=200)


class ApplicationNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ["employer_rating", "employer_notes", "interview_at"]


# --------------------------------------------------------------------------- #
# Saved searches
# --------------------------------------------------------------------------- #

ALLOWED_FILTER_KEYS = {"location_type", "employment_type", "experience_level", "category",
                       "country", "location", "currency", "salary_min", "salary_max",
                       "max_years", "skills", "employer", "posted_within"}


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ["id", "name", "query", "filters", "alert_enabled", "frequency",
                  "notify_push", "notify_email", "last_alerted_at", "created_at"]
        read_only_fields = ["id", "last_alerted_at", "created_at"]

    def validate_filters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("filters must be an object.")
        unknown = set(value) - ALLOWED_FILTER_KEYS
        if unknown:
            raise serializers.ValidationError(f"Unknown filter(s): {', '.join(sorted(unknown))}")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request and self.instance is None:
            if SavedSearch.objects.filter(user=request.user).count() >= 20:
                raise serializers.ValidationError("You can keep up to 20 saved searches.")
        return attrs


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "thread_id", "sender_id", "sender_name", "kind", "body",
                  "attachment_url", "attachment_name", "attachment_type", "attachment_size",
                  "client_id", "created_at"]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return _name(obj.sender) if obj.sender_id else "OAM"


class ChatSendSerializer(serializers.Serializer):
    body = serializers.CharField(required=False, allow_blank=True, max_length=4000)
    client_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    attachment = serializers.DictField(required=False)


class ChatThreadSerializer(serializers.ModelSerializer):
    employer = EmployerMiniSerializer(read_only=True)
    candidate = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()
    my_side = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    application_status = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ["id", "employer", "candidate", "job", "application_id", "application_status",
                  "my_side", "unread", "last_message_at", "last_message_preview",
                  "employer_last_read_at", "candidate_last_read_at", "is_closed", "created_at"]
        read_only_fields = fields

    def _user(self):
        return self.context["request"].user

    def get_candidate(self, obj):
        return {"id": str(obj.candidate_id), "display_name": obj.candidate.display_name,
                "headline": obj.candidate.headline, "photo_url": obj.candidate.photo_url}

    def get_job(self, obj):
        return {"id": str(obj.job_id), "title": obj.job.title} if obj.job_id else None

    def get_my_side(self, obj):
        return obj.side_of(self._user())

    def get_unread(self, obj):
        from .services import ChatService
        return ChatService.unread_for(obj, self._user())

    def get_application_status(self, obj):
        return obj.application.status if obj.application_id else None


class DirectThreadSerializer(serializers.Serializer):
    candidate = serializers.UUIDField()
    job = serializers.UUIDField(required=False, allow_null=True)
    body = serializers.CharField(required=False, allow_blank=True, max_length=4000)


# --------------------------------------------------------------------------- #
# Billing
# --------------------------------------------------------------------------- #

class CheckoutSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=JobPayment.Purpose.choices)
    plan = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(required=False, min_value=1, max_value=20, default=1)
    days = serializers.IntegerField(required=False, default=0)
    job = serializers.UUIDField(required=False, allow_null=True)
    currency = serializers.CharField(required=False, default="NGN")


class JobPaymentSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True, default=None)

    class Meta:
        model = JobPayment
        fields = ["id", "purpose", "plan", "job", "job_title", "quantity", "days", "amount",
                  "currency", "reference", "provider", "status", "authorization_url",
                  "paid_at", "created_at"]
        read_only_fields = fields
