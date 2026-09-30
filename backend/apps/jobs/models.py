"""
Jobs & Recruitment: employers, candidates, listings, applications, alerts,
recruitment chat and employer billing.

WHO IS WHO
  Any OAM user can be a candidate, an employer, or both. An EmployerProfile is a
  company page owned by one user; a CandidateProfile is a person's CV. Both are
  created on demand, so a normal OAM account needs no extra signup.

WHY CHAT LIVES HERE AND NOT IN apps.messaging
  apps.messaging hides phone numbers until a provider accepts, and threads hang
  off a listing or artisan. Recruitment chat has different rules: it belongs to
  an application (or, for Pro employers, a direct approach to a candidate),
  carries CV/offer attachments, and must stream in real time. Keeping it in its
  own tables avoids bending the marketplace rules to fit.

SEARCH
  JobListing.search_vector is a Postgres tsvector kept up to date by
  services.refresh_search_vector(). On SQLite (quick local dev) it stays empty
  and search falls back to icontains — see search.py.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.postgres.search import SearchVectorField
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel

from .plans import PLAN_FREE, PLANS, get_plan


# --------------------------------------------------------------------------- #
# Shared choices
# --------------------------------------------------------------------------- #

class LocationType(models.TextChoices):
    REMOTE = "remote", _("Remote")
    HYBRID = "hybrid", _("Hybrid")
    ON_SITE = "on_site", _("On-site")


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", _("Full-time")
    PART_TIME = "part_time", _("Part-time")
    CONTRACT = "contract", _("Contract")
    TEMPORARY = "temporary", _("Temporary")
    INTERNSHIP = "internship", _("Internship")
    FREELANCE = "freelance", _("Freelance")


class ExperienceLevel(models.TextChoices):
    ENTRY = "entry", _("Entry level")
    MID = "mid", _("Mid level")
    SENIOR = "senior", _("Senior")
    LEAD = "lead", _("Lead / Manager")
    EXECUTIVE = "executive", _("Executive")


class JobCategory(models.TextChoices):
    TECHNOLOGY = "technology", _("Technology")
    ENGINEERING = "engineering", _("Engineering")
    FINANCE = "finance", _("Finance & Accounting")
    SALES = "sales", _("Sales & Business Development")
    MARKETING = "marketing", _("Marketing & Communications")
    DESIGN = "design", _("Design & Creative")
    OPERATIONS = "operations", _("Operations & Logistics")
    CUSTOMER_SERVICE = "customer_service", _("Customer Service")
    HEALTHCARE = "healthcare", _("Healthcare")
    EDUCATION = "education", _("Education & Training")
    HOSPITALITY = "hospitality", _("Hospitality & Travel")
    ADMIN = "admin", _("Administration")
    LEGAL = "legal", _("Legal")
    HR = "hr", _("Human Resources")
    TRADES = "trades", _("Skilled Trades & Artisans")
    DRIVING = "driving", _("Driving & Delivery")
    OTHER = "other", _("Other")


class SalaryPeriod(models.TextChoices):
    HOUR = "hour", _("per hour")
    DAY = "day", _("per day")
    MONTH = "month", _("per month")
    YEAR = "year", _("per year")


def _unique_slug(model, base: str, instance_pk=None, max_length=80) -> str:
    base = (slugify(base) or "item")[: max_length - 9]
    slug = base
    qs = model.objects.all()
    if instance_pk:
        qs = qs.exclude(pk=instance_pk)
    while qs.filter(slug=slug).exists():
        slug = f"{base}-{uuid.uuid4().hex[:8]}"
    return slug


# --------------------------------------------------------------------------- #
# Profiles
# --------------------------------------------------------------------------- #

class EmployerProfile(TimeStampedModel):
    """A company page. One per owning user."""

    class Verification(models.TextChoices):
        UNVERIFIED = "unverified", _("Unverified")
        PENDING = "pending", _("Pending review")
        VERIFIED = "verified", _("Verified")
        REJECTED = "rejected", _("Rejected")

    class CompanySize(models.TextChoices):
        SOLO = "1", _("Just me")
        MICRO = "2-10", _("2–10")
        SMALL = "11-50", _("11–50")
        MEDIUM = "51-200", _("51–200")
        LARGE = "201-1000", _("201–1,000")
        ENTERPRISE = "1000+", _("1,000+")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="employer_profile")
    company_name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    industry = models.CharField(max_length=40, choices=JobCategory.choices, blank=True)
    company_size = models.CharField(max_length=10, choices=CompanySize.choices, blank=True)
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    headquarters = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=2, blank=True, help_text=_("ISO-3166 alpha-2"))

    # Branding
    logo_url = models.URLField(max_length=500, blank=True)
    cover_url = models.URLField(max_length=500, blank=True)
    brand_color = models.CharField(max_length=7, blank=True, help_text=_("Hex, e.g. #0F766E"))

    # Verification (reviewed by staff in the admin)
    verification_status = models.CharField(max_length=12, choices=Verification.choices,
                                           default=Verification.UNVERIFIED, db_index=True)
    registration_number = models.CharField(max_length=60, blank=True,
                                           help_text=_("e.g. CAC RC number"))
    verification_document_url = models.URLField(max_length=500, blank=True)
    verification_note = models.CharField(max_length=255, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["company_name"]
        indexes = [models.Index(fields=["verification_status", "is_active"])]

    def __str__(self):
        return self.company_name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(EmployerProfile, self.company_name, self.pk)
        super().save(*args, **kwargs)

    @property
    def is_verified(self) -> bool:
        return self.verification_status == self.Verification.VERIFIED

    @property
    def subscription_tier(self) -> str:
        sub = getattr(self, "subscription", None)
        return sub.active_plan if sub else PLAN_FREE

    @property
    def plan(self):
        return get_plan(self.subscription_tier)


class CandidateProfile(TimeStampedModel):
    """A job seeker's CV and preferences. One per user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="candidate_profile")
    headline = models.CharField(max_length=160, blank=True)
    summary = models.TextField(blank=True)

    cv_url = models.URLField(max_length=500, blank=True)
    cv_filename = models.CharField(max_length=200, blank=True)
    cv_updated_at = models.DateTimeField(null=True, blank=True)
    photo_url = models.URLField(max_length=500, blank=True)

    skills = models.JSONField(default=list, blank=True,
                              help_text=_("List of skill names, as the candidate typed them."))
    skills_text = models.TextField(blank=True, editable=False,
                                   help_text=_("Normalised, space-joined skills (search + matching)."))
    years_experience = models.PositiveSmallIntegerField(default=0,
                                                        validators=[MaxValueValidator(60)])
    experience_level = models.CharField(max_length=12, choices=ExperienceLevel.choices, blank=True)
    # [{title, company, start, end, current, description}]
    experience = models.JSONField(default=list, blank=True)
    # [{school, qualification, field, start, end}]
    education = models.JSONField(default=list, blank=True)
    languages = models.JSONField(default=list, blank=True)
    links = models.JSONField(default=dict, blank=True, help_text=_("{linkedin, github, portfolio}"))

    location = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=2, blank=True)

    # Preferences
    desired_titles = models.JSONField(default=list, blank=True)
    desired_categories = models.JSONField(default=list, blank=True)
    desired_location_types = models.JSONField(default=list, blank=True)
    desired_employment_types = models.JSONField(default=list, blank=True)
    desired_salary_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    desired_salary_currency = models.CharField(max_length=3, default="NGN")
    desired_salary_period = models.CharField(max_length=8, choices=SalaryPeriod.choices,
                                             default=SalaryPeriod.MONTH)
    willing_to_relocate = models.BooleanField(default=False)

    open_to_work = models.BooleanField(default=True)
    is_searchable = models.BooleanField(
        default=True, help_text=_("Visible to employers searching the candidate database."))

    class Meta:
        indexes = [
            models.Index(fields=["is_searchable", "open_to_work"]),
            models.Index(fields=["country"]),
        ]

    def __str__(self):
        return f"{self.user} · {self.headline or 'candidate'}"

    def save(self, *args, **kwargs):
        from .matching import normalise_skills
        self.skills = [s.strip() for s in (self.skills or []) if str(s).strip()][:50]
        self.skills_text = " ".join(normalise_skills(self.skills))
        super().save(*args, **kwargs)

    @property
    def display_name(self) -> str:
        u = self.user
        name = f"{u.first_name} {u.last_name}".strip()
        return name or (u.email or "").split("@")[0] or "Candidate"

    @property
    def completeness(self) -> int:
        """0–100: nudges candidates to finish their profile (and improves matching)."""
        checks = [bool(self.headline), bool(self.summary), bool(self.cv_url),
                  len(self.skills or []) >= 3, bool(self.experience),
                  bool(self.location or self.country), bool(self.desired_location_types),
                  bool(self.education)]
        return int(round(100 * sum(checks) / len(checks)))


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #

class JobListingQuerySet(models.QuerySet):
    def live(self):
        now = timezone.now()
        return self.filter(status=JobListing.Status.ACTIVE, expires_at__gt=now,
                           employer__is_active=True)

    def promoted_first(self):
        now = timezone.now()
        return self.annotate(
            promo_rank=models.Case(
                models.When(boosted_until__gt=now, then=models.Value(0)),
                models.When(featured_until__gt=now, then=models.Value(1)),
                default=models.Value(2), output_field=models.IntegerField(),
            )
        )


class JobListing(TimeStampedModel):

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        PENDING_REVIEW = "pending_review", _("Pending review")
        ACTIVE = "active", _("Active")
        PAUSED = "paused", _("Paused")
        CLOSED = "closed", _("Closed")
        EXPIRED = "expired", _("Expired")
        REJECTED = "rejected", _("Rejected")

    class ApplyMethod(models.TextChoices):
        IN_APP = "in_app", _("Apply on OAM")
        EXTERNAL = "external", _("External website")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name="jobs")
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, related_name="jobs_posted")

    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField()
    responsibilities = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    skills_text = models.TextField(blank=True, editable=False)
    screening_questions = models.JSONField(
        default=list, blank=True,
        help_text=_("[{id, question, required}] asked at apply time."))

    category = models.CharField(max_length=24, choices=JobCategory.choices,
                                default=JobCategory.OTHER, db_index=True)
    employment_type = models.CharField(max_length=12, choices=EmploymentType.choices,
                                       default=EmploymentType.FULL_TIME)
    experience_level = models.CharField(max_length=12, choices=ExperienceLevel.choices,
                                        default=ExperienceLevel.MID)
    min_years_experience = models.PositiveSmallIntegerField(default=0)

    location_type = models.CharField(max_length=10, choices=LocationType.choices,
                                     default=LocationType.ON_SITE)
    location = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=2, blank=True)

    salary_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default="NGN")
    salary_period = models.CharField(max_length=8, choices=SalaryPeriod.choices,
                                     default=SalaryPeriod.MONTH)
    salary_visible = models.BooleanField(default=True)

    apply_method = models.CharField(max_length=10, choices=ApplyMethod.choices,
                                    default=ApplyMethod.IN_APP)
    external_apply_url = models.URLField(max_length=500, blank=True)
    openings = models.PositiveSmallIntegerField(default=1)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Promotion
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateTimeField(null=True, blank=True)
    is_boosted = models.BooleanField(default=False)
    boosted_until = models.DateTimeField(null=True, blank=True)
    posted_with_credit = models.BooleanField(
        default=False, help_text=_("Published using a pay-per-job credit (doesn't count "
                                   "against the plan's active-job limit)."))

    # Counters (denormalised; updated with F() expressions)
    views_count = models.PositiveIntegerField(default=0)
    applications_count = models.PositiveIntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)

    # Moderation
    content_hash = models.CharField(max_length=40, blank=True, db_index=True)
    risk_score = models.PositiveSmallIntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    moderation_note = models.CharField(max_length=255, blank=True)

    search_vector = SearchVectorField(null=True, editable=False)

    objects = JobListingQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "expires_at"], name="jobs_status_expiry_idx"),
            models.Index(fields=["employer", "status"], name="jobs_employer_status_idx"),
            models.Index(fields=["location_type", "status"], name="jobs_loctype_idx"),
            models.Index(fields=["employment_type", "status"], name="jobs_emptype_idx"),
            models.Index(fields=["country", "status"], name="jobs_country_idx"),
            models.Index(fields=["-published_at"], name="jobs_published_idx"),
            models.Index(fields=["boosted_until"], name="jobs_boosted_idx"),
            models.Index(fields=["featured_until"], name="jobs_featured_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=(models.Q(salary_min__isnull=True) | models.Q(salary_max__isnull=True)
                       | models.Q(salary_min__lte=models.F("salary_max"))),
                name="jobs_salary_range_valid",
            ),
        ]

    def __str__(self):
        return f"{self.title} @ {self.employer}"

    def save(self, *args, **kwargs):
        from .matching import normalise_skills
        if not self.slug:
            self.slug = _unique_slug(JobListing, f"{self.title}-{self.employer.company_name}",
                                     self.pk)
        self.skills = [s.strip() for s in (self.skills or []) if str(s).strip()][:30]
        self.skills_text = " ".join(normalise_skills(self.skills))
        super().save(*args, **kwargs)

    @property
    def is_live(self) -> bool:
        return (self.status == self.Status.ACTIVE and self.expires_at is not None
                and self.expires_at > timezone.now())

    @property
    def is_promoted(self) -> bool:
        now = timezone.now()
        return bool((self.boosted_until and self.boosted_until > now)
                    or (self.featured_until and self.featured_until > now))


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

class ApplicationStatus(models.TextChoices):
    APPLIED = "applied", _("Applied")
    UNDER_REVIEW = "under_review", _("Under review")
    SHORTLISTED = "shortlisted", _("Shortlisted")
    INTERVIEW = "interview", _("Interview")
    OFFER = "offer", _("Offer")
    HIRED = "hired", _("Hired")
    REJECTED = "rejected", _("Rejected")
    WITHDRAWN = "withdrawn", _("Withdrawn")


# Pipeline order — drives the kanban columns on web and mobile.
PIPELINE = [
    ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFER, ApplicationStatus.HIRED, ApplicationStatus.REJECTED,
]

# Which moves an EMPLOYER may make. Employers can move forward, step back one
# stage (mis-clicks happen on a kanban board) or reject at any point before
# hire. HIRED, REJECTED and WITHDRAWN are terminal except that a rejection can
# be reversed to UNDER_REVIEW.
_S = ApplicationStatus
EMPLOYER_TRANSITIONS: dict[str, set[str]] = {
    _S.APPLIED: {_S.UNDER_REVIEW, _S.SHORTLISTED, _S.INTERVIEW, _S.REJECTED},
    _S.UNDER_REVIEW: {_S.APPLIED, _S.SHORTLISTED, _S.INTERVIEW, _S.REJECTED},
    _S.SHORTLISTED: {_S.UNDER_REVIEW, _S.INTERVIEW, _S.OFFER, _S.REJECTED},
    _S.INTERVIEW: {_S.SHORTLISTED, _S.OFFER, _S.REJECTED},
    _S.OFFER: {_S.INTERVIEW, _S.HIRED, _S.REJECTED},
    _S.HIRED: set(),
    _S.REJECTED: {_S.UNDER_REVIEW},
    _S.WITHDRAWN: set(),
}
CANDIDATE_WITHDRAWABLE = {_S.APPLIED, _S.UNDER_REVIEW, _S.SHORTLISTED, _S.INTERVIEW, _S.OFFER}


class JobApplication(TimeStampedModel):
    class Source(models.TextChoices):
        ONE_CLICK = "one_click", _("1-click apply")
        FORM = "form", _("Full application")
        INVITED = "invited", _("Invited by employer")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE,
                                  related_name="applications")
    status = models.CharField(max_length=14, choices=ApplicationStatus.choices,
                              default=ApplicationStatus.APPLIED)
    status_changed_at = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.ONE_CLICK)

    cover_letter = models.TextField(blank=True, max_length=5000)
    cv_url = models.URLField(max_length=500, blank=True, help_text=_("CV snapshot at apply time"))
    answers = models.JSONField(default=list, blank=True)
    expected_salary = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    match_score = models.PositiveSmallIntegerField(default=0,
                                                   validators=[MaxValueValidator(100)])
    match_details = models.JSONField(default=dict, blank=True)

    # Employer-private
    employer_rating = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    employer_notes = models.TextField(blank=True)
    interview_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    viewed_by_employer_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["job", "candidate"], name="jobs_one_application_per_job"),
        ]
        indexes = [
            models.Index(fields=["job", "status"], name="jobs_app_job_status_idx"),
            models.Index(fields=["candidate", "-created_at"], name="jobs_app_candidate_idx"),
            models.Index(fields=["status", "status_changed_at"], name="jobs_app_status_idx"),
        ]

    def __str__(self):
        return f"{self.candidate} → {self.job.title} [{self.status}]"


class ApplicationStatusEvent(models.Model):
    """Audit trail for the pipeline (and the candidate's status timeline)."""
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE,
                                    related_name="events")
    from_status = models.CharField(max_length=14, blank=True)
    to_status = models.CharField(max_length=14)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True)
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.application_id}: {self.from_status} → {self.to_status}"


class SavedJob(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="saved_jobs")
    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="saves")

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "job"], name="jobs_saved_once")]


# --------------------------------------------------------------------------- #
# Saved searches & alerts
# --------------------------------------------------------------------------- #

class SavedSearch(TimeStampedModel):
    """
    A search the candidate wants to come back to — and optionally be alerted on.

    `filters` holds the same query params the search endpoint accepts
    (location_type, employment_type, category, salary_min, country, …) so an
    alert and a manual search always return the same jobs.
    """

    class Frequency(models.TextChoices):
        INSTANT = "instant", _("Instantly")
        DAILY = "daily", _("Daily digest")
        WEEKLY = "weekly", _("Weekly digest")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="job_saved_searches")
    name = models.CharField(max_length=120)
    query = models.CharField(max_length=200, blank=True)
    filters = models.JSONField(default=dict, blank=True)

    alert_enabled = models.BooleanField(default=True)
    frequency = models.CharField(max_length=8, choices=Frequency.choices,
                                 default=Frequency.DAILY)
    notify_push = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=False)
    last_alerted_at = models.DateTimeField(null=True, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["alert_enabled", "frequency", "last_alerted_at"],
                                name="jobs_alert_due_idx")]

    def __str__(self):
        return f"{self.user} · {self.name}"

    def is_due(self, now=None) -> bool:
        now = now or timezone.now()
        if not self.alert_enabled:
            return False
        if self.last_alerted_at is None:
            return True
        gap = {self.Frequency.INSTANT: timedelta(minutes=0),
               self.Frequency.DAILY: timedelta(hours=23),
               self.Frequency.WEEKLY: timedelta(days=6, hours=23)}[self.frequency]
        return self.last_alerted_at <= now - gap


class JobAlertDelivery(models.Model):
    """One job sent to one saved search — so nobody gets the same job twice."""
    saved_search = models.ForeignKey(SavedSearch, on_delete=models.CASCADE,
                                     related_name="deliveries")
    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="alert_deliveries")
    channel = models.CharField(max_length=10, default="push")
    delivered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["saved_search", "job"],
                                               name="jobs_alert_once_per_job")]


# --------------------------------------------------------------------------- #
# Recruitment chat
# --------------------------------------------------------------------------- #

class ChatThread(TimeStampedModel):
    """
    A private employer ↔ candidate conversation.

    Usually tied to an application. Pro employers may also open a thread with a
    candidate from the database who never applied (application is null, job is
    optional context).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE,
                                 related_name="chat_threads")
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE,
                                  related_name="chat_threads")
    application = models.OneToOneField(JobApplication, on_delete=models.CASCADE,
                                       null=True, blank=True, related_name="thread")
    job = models.ForeignKey(JobListing, on_delete=models.SET_NULL, null=True, blank=True,
                            related_name="chat_threads")
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, related_name="+")

    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_message_preview = models.CharField(max_length=140, blank=True)
    employer_last_read_at = models.DateTimeField(null=True, blank=True)
    candidate_last_read_at = models.DateTimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-last_message_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employer", "candidate"], condition=models.Q(application__isnull=True),
                name="jobs_one_direct_thread_per_pair",
            ),
        ]
        indexes = [
            models.Index(fields=["employer", "-last_message_at"], name="jobs_thread_emp_idx"),
            models.Index(fields=["candidate", "-last_message_at"], name="jobs_thread_cand_idx"),
        ]

    def __str__(self):
        return f"{self.employer} ↔ {self.candidate}"

    def is_participant(self, user) -> bool:
        return user.is_authenticated and user.id in (self.employer.owner_id, self.candidate.user_id)

    def side_of(self, user) -> str:
        return "employer" if user.id == self.employer.owner_id else "candidate"

    def other_user(self, user):
        return self.candidate.user if user.id == self.employer.owner_id else self.employer.owner

    def participant_ids(self) -> list:
        return [self.employer.owner_id, self.candidate.user_id]


class ChatMessage(models.Model):
    class Kind(models.TextChoices):
        TEXT = "text", _("Text")
        ATTACHMENT = "attachment", _("Attachment")
        SYSTEM = "system", _("System")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="job_chat_messages")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.TEXT)
    body = models.TextField(max_length=4000, blank=True)

    attachment_url = models.URLField(max_length=500, blank=True)
    attachment_name = models.CharField(max_length=200, blank=True)
    attachment_type = models.CharField(max_length=100, blank=True, help_text=_("MIME type"))
    attachment_size = models.PositiveIntegerField(null=True, blank=True)

    client_id = models.CharField(max_length=64, blank=True,
                                 help_text=_("Client-generated id for optimistic UI de-duplication"))
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["thread", "created_at"], name="jobs_msg_thread_idx")]

    def __str__(self):
        return f"{self.sender}: {self.body[:40]}"


# --------------------------------------------------------------------------- #
# Subscription & billing
# --------------------------------------------------------------------------- #

class EmployerSubscription(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        CANCELLED = "cancelled", _("Cancelled")   # runs to period end, then free

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.OneToOneField(EmployerProfile, on_delete=models.CASCADE,
                                    related_name="subscription")
    plan = models.CharField(max_length=10, choices=[(k, p.label) for k, p in PLANS.items()],
                            default=PLAN_FREE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    expiry_reminder_sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.employer} · {self.plan}"

    @property
    def active_plan(self) -> str:
        """A lapsed paid plan quietly falls back to free (no cron needed)."""
        if self.plan != PLAN_FREE and (self.current_period_end is None
                                       or self.current_period_end <= timezone.now()):
            return PLAN_FREE
        return self.plan


class JobPayment(TimeStampedModel):
    """One checkout: a plan, pay-per-job credits, a boost or a feature."""

    class Purpose(models.TextChoices):
        PLAN = "plan", _("Subscription plan")
        JOB_CREDIT = "job_credit", _("Pay-per-job credits")
        BOOST = "boost", _("Listing boost")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID = "paid", _("Paid")
        FAILED = "failed", _("Failed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE,
                                 related_name="payments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="job_payments")
    purpose = models.CharField(max_length=12, choices=Purpose.choices)
    plan = models.CharField(max_length=10, blank=True)
    job = models.ForeignKey(JobListing, on_delete=models.SET_NULL, null=True, blank=True,
                            related_name="payments")
    quantity = models.PositiveSmallIntegerField(default=1)
    days = models.PositiveSmallIntegerField(default=0)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    reference = models.CharField(max_length=80, unique=True)
    provider = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)
    authorization_url = models.URLField(max_length=600, blank=True)
    raw = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["employer", "status"], name="jobs_payment_emp_idx")]

    def __str__(self):
        return f"{self.employer} {self.purpose} {self.amount} {self.currency} [{self.status}]"


class JobPostCredit(TimeStampedModel):
    """Pay-per-job credits bought in one payment."""
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE,
                                 related_name="job_credits")
    payment = models.ForeignKey(JobPayment, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="credits")
    quantity = models.PositiveSmallIntegerField(default=1)
    used = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["expires_at"]

    @property
    def remaining(self) -> int:
        return max(0, self.quantity - self.used)


class CandidateProfileView(models.Model):
    """An employer opening a candidate's full profile from the database (quota)."""
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE,
                                 related_name="candidate_views")
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE,
                                  related_name="employer_views")
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [models.Index(fields=["employer", "viewed_at"], name="jobs_cview_emp_idx")]


class JobFlag(TimeStampedModel):
    """A moderation signal on a listing — automatic or reported by a user."""

    class Kind(models.TextChoices):
        DUPLICATE = "duplicate", _("Duplicate")
        SUSPICIOUS = "suspicious", _("Suspicious content")
        REPORTED = "reported", _("Reported by user")

    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="flags")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    reason = models.CharField(max_length=500)
    score = models.PositiveSmallIntegerField(default=0)
    related_job = models.ForeignKey(JobListing, on_delete=models.SET_NULL, null=True,
                                    blank=True, related_name="+")
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name="+")
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["resolved", "kind"], name="jobs_flag_open_idx")]

    def __str__(self):
        return f"{self.kind}: {self.job_id}"


# --------------------------------------------------------------------------- #
# Engagement — likes & comments (mirrors the marketplace)
# --------------------------------------------------------------------------- #

class JobLike(TimeStampedModel):
    """A user's like on a job. Unique per (job, user) — the like toggles."""
    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="job_likes")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["job", "user"], name="jobs_like_once")]
        indexes = [models.Index(fields=["job"], name="jobs_like_job_idx")]

    def __str__(self):
        return f"{self.user} ♥ {self.job_id}"


class JobComment(TimeStampedModel):
    """A public comment on a job post."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(JobListing, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="job_comments")
    body = models.TextField(max_length=1000)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["job", "-created_at"], name="jobs_comment_job_idx")]

    def __str__(self):
        return f"comment by {self.user} on {self.job_id}"
