"""
Job search: django-filter FilterSet + PostgreSQL full-text search.

On Postgres, `q` runs against the stored, weighted tsvector (title A, skills B,
description/requirements C) with websearch syntax, so users can type
`"react native" -php lagos`. Results are ranked by relevance, with boosted and
featured listings pinned above organic results.

On SQLite (quick local dev) it degrades to icontains — same API, no ranking.
"""
from __future__ import annotations

from datetime import timedelta

import django_filters as df
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import connection
from django.db.models import F, Q
from django.utils import timezone

from .models import (
    CandidateProfile,
    EmploymentType,
    ExperienceLevel,
    JobCategory,
    JobListing,
    LocationType,
)

SEARCH_CONFIG = "english"


def is_postgres() -> bool:
    return connection.vendor == "postgresql"


def job_search_vector():
    return (SearchVector("title", weight="A", config=SEARCH_CONFIG)
            + SearchVector("skills_text", weight="B", config=SEARCH_CONFIG)
            + SearchVector("description", "requirements", "responsibilities",
                           weight="C", config=SEARCH_CONFIG))


def refresh_search_vector(job_ids=None) -> int:
    """Recompute stored tsvectors. No-op outside Postgres."""
    if not is_postgres():
        return 0
    qs = JobListing.objects.all()
    if job_ids is not None:
        qs = qs.filter(pk__in=list(job_ids))
    return qs.update(search_vector=job_search_vector())


def apply_text_search(qs, q: str):
    q = (q or "").strip()
    if not q:
        return qs
    if is_postgres():
        query = SearchQuery(q, config=SEARCH_CONFIG, search_type="websearch")
        return qs.filter(search_vector=query).annotate(
            rank=SearchRank(F("search_vector"), query))
    cond = Q()
    for word in q.split():
        cond &= (Q(title__icontains=word) | Q(description__icontains=word)
                 | Q(skills_text__icontains=word.lower())
                 | Q(employer__company_name__icontains=word))
    return qs.filter(cond)


class CharInFilter(df.BaseInFilter, df.CharFilter):
    """?location_type=remote,hybrid"""


class JobListingFilter(df.FilterSet):
    q = df.CharFilter(method="filter_q", label="Keywords")
    location_type = CharInFilter(field_name="location_type", lookup_expr="in")
    employment_type = CharInFilter(field_name="employment_type", lookup_expr="in")
    experience_level = CharInFilter(field_name="experience_level", lookup_expr="in")
    category = CharInFilter(field_name="category", lookup_expr="in")
    country = df.CharFilter(field_name="country", lookup_expr="iexact")
    location = df.CharFilter(field_name="location", lookup_expr="icontains")
    employer = df.CharFilter(method="filter_employer")
    currency = df.CharFilter(field_name="salary_currency", lookup_expr="iexact")
    salary_min = df.NumberFilter(method="filter_salary_min",
                                 label="Pays at least (overlaps the range)")
    salary_max = df.NumberFilter(field_name="salary_min", lookup_expr="lte")
    max_years = df.NumberFilter(field_name="min_years_experience", lookup_expr="lte")
    posted_within = df.NumberFilter(method="filter_posted_within", label="Posted within N days")
    skills = df.CharFilter(method="filter_skills", label="Comma-separated skills (all required)")
    featured = df.BooleanFilter(method="filter_featured")
    ordering = df.ChoiceFilter(
        method="filter_ordering", empty_label=None,
        choices=[("relevance", "Relevance"), ("newest", "Newest"),
                 ("salary", "Highest salary"), ("closing", "Closing soon")])

    class Meta:
        model = JobListing
        fields = []

    def filter_q(self, qs, name, value):
        return apply_text_search(qs, value)

    def filter_employer(self, qs, name, value):
        return qs.filter(employer_id=value) if _is_uuid(value) \
            else qs.filter(employer__slug=value)

    def filter_salary_min(self, qs, name, value):
        # a job "pays at least X" if the top of its range reaches X
        return qs.filter(Q(salary_max__gte=value)
                         | Q(salary_max__isnull=True, salary_min__gte=value))

    def filter_posted_within(self, qs, name, value):
        return qs.filter(published_at__gte=timezone.now() - timedelta(days=int(value)))

    def filter_skills(self, qs, name, value):
        from .matching import normalise_skill
        for s in [x for x in value.split(",") if x.strip()]:
            qs = qs.filter(skills_text__icontains=normalise_skill(s))
        return qs

    def filter_featured(self, qs, name, value):
        now = timezone.now()
        promoted = Q(featured_until__gt=now) | Q(boosted_until__gt=now)
        return qs.filter(promoted) if value else qs.exclude(promoted)

    def filter_ordering(self, qs, name, value):
        return qs   # applied in `search_jobs` after all filters (needs rank)


def search_jobs(params, base_qs=None):
    """Filter + order live jobs from request query params."""
    qs = (base_qs if base_qs is not None else JobListing.objects.live()) \
        .select_related("employer", "employer__subscription")
    fs = JobListingFilter(params, queryset=qs)
    qs = fs.qs if fs.is_valid() else qs.none()
    qs = qs.promoted_first()

    ordering = params.get("ordering") or "relevance"
    has_rank = bool((params.get("q") or "").strip()) and is_postgres()
    if ordering == "newest":
        return qs.order_by("-published_at"), fs
    if ordering == "salary":
        return qs.order_by(F("salary_max").desc(nulls_last=True), "-published_at"), fs
    if ordering == "closing":
        return qs.order_by("expires_at"), fs
    if has_rank:
        return qs.order_by("promo_rank", "-rank", "-published_at"), fs
    return qs.order_by("promo_rank", "-published_at"), fs


def search_candidates(params):
    """Employer-side candidate database search (plan-gated in the view)."""
    qs = CandidateProfile.objects.filter(is_searchable=True).select_related("user")
    q = (params.get("q") or "").strip()
    if q:
        cond = Q()
        for word in q.split():
            cond &= (Q(headline__icontains=word) | Q(summary__icontains=word)
                     | Q(skills_text__icontains=word.lower()))
        qs = qs.filter(cond)
    skills = params.get("skills")
    if skills:
        from .matching import normalise_skill
        for s in [x for x in skills.split(",") if x.strip()]:
            qs = qs.filter(skills_text__icontains=normalise_skill(s))
    if params.get("country"):
        qs = qs.filter(country__iexact=params["country"])
    if params.get("location"):
        qs = qs.filter(location__icontains=params["location"])
    if params.get("min_years"):
        try:
            qs = qs.filter(years_experience__gte=int(params["min_years"]))
        except ValueError:
            pass
    if params.get("experience_level"):
        qs = qs.filter(experience_level__in=params["experience_level"].split(","))
    if params.get("open_to_work") in ("1", "true", "True"):
        qs = qs.filter(open_to_work=True)
    return qs.order_by("-open_to_work", "-updated_at")


def choices_payload() -> dict:
    """Enum values for building filter UIs and the posting wizard."""
    def _c(choices):
        return [{"value": v, "label": str(label)} for v, label in choices]
    from .models import ApplicationStatus, PIPELINE, SalaryPeriod, SavedSearch
    return {
        "location_types": _c(LocationType.choices),
        "employment_types": _c(EmploymentType.choices),
        "experience_levels": _c(ExperienceLevel.choices),
        "categories": _c(JobCategory.choices),
        "salary_periods": _c(SalaryPeriod.choices),
        "application_statuses": _c(ApplicationStatus.choices),
        "pipeline": [str(s) for s in PIPELINE],
        "alert_frequencies": _c(SavedSearch.Frequency.choices),
        "orderings": ["relevance", "newest", "salary", "closing"],
    }


def _is_uuid(value) -> bool:
    import uuid
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False
