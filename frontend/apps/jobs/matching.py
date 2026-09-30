"""
Smart matching: how well does a candidate fit a job (0–100)?

ALGORITHM (hybrid, explainable)
  score = 45% skills  +  25% text similarity  +  15% experience  +  15% preferences

  • Skills — share of the job's required skills the candidate has, after
    normalising synonyms ("ReactJS" == "react", "JS" == "javascript").
    A few extra skills never hurt; missing ones are returned so the UI can say
    "You're missing: Docker, AWS".
  • Text similarity — TF-IDF cosine between the candidate's headline/summary/
    experience and the job's title/description/requirements. IDF weights come
    from the live job corpus (cached), so common words like "team" count for
    little and rare ones like "kubernetes" count for a lot.
  • Experience — full marks at or above the job's minimum years, tapering off
    below it, with a mild penalty for being far over-qualified.
  • Preferences — location type, employment type, category and salary overlap.

WHY NOT EMBEDDINGS FROM DAY ONE
  TF-IDF + skills needs no GPU, no API bill and no new Postgres extension, and
  its scores can be explained to a user. The upgrade path is documented at the
  bottom of this file: swap `text_similarity()` for cosine distance on pgvector
  embeddings, keep the rest.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from decimal import Decimal

from django.core.cache import cache

WEIGHTS = {"skills": 0.45, "text": 0.25, "experience": 0.15, "preferences": 0.15}

# Canonical names for common skill spellings. Extend freely.
SKILL_SYNONYMS = {
    "js": "javascript", "javascript es6": "javascript", "es6": "javascript",
    "ts": "typescript",
    "reactjs": "react", "react.js": "react", "react js": "react",
    "react native": "react-native", "reactnative": "react-native", "rn": "react-native",
    "node": "nodejs", "node.js": "nodejs", "node js": "nodejs",
    "vuejs": "vue", "vue.js": "vue",
    "nextjs": "next.js", "next": "next.js",
    "py": "python", "python3": "python",
    "django rest framework": "drf", "djangorestframework": "drf",
    "postgres": "postgresql", "psql": "postgresql",
    "k8s": "kubernetes",
    "aws cloud": "aws", "amazon web services": "aws",
    "gcp": "google cloud", "google cloud platform": "google cloud",
    "ms excel": "excel", "microsoft excel": "excel",
    "ml": "machine learning", "ai": "artificial intelligence",
    "ui/ux": "ux design", "ux": "ux design", "ui": "ui design",
    "c sharp": "c#", "csharp": "c#", "golang": "go",
    "accounting": "accounting", "bookkeeping": "bookkeeping",
    "customer care": "customer service", "customer support": "customer service",
    "driving licence": "driving", "drivers license": "driving",
}

_STOPWORDS = set("""
a an and are as at be by for from has have in is it its of on or that the to
was were will with you your we our they their this those these can able who
what when where which while within about into over under per via etc also
job role work working team candidate candidates experience years year strong
good excellent ability skills skill knowledge required requirements preferred
""".split())

_TOKEN = re.compile(r"[a-z0-9][a-z0-9+#.\-]*")


def normalise_skill(skill: str) -> str:
    s = re.sub(r"\s+", " ", str(skill).strip().lower())
    return SKILL_SYNONYMS.get(s, s)


def normalise_skills(skills) -> list[str]:
    seen, out = set(), []
    for s in skills or []:
        n = normalise_skill(s)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def tokenize(text: str) -> list[str]:
    tokens = _TOKEN.findall((text or "").lower())
    return [t.strip(".-") for t in tokens if t not in _STOPWORDS and len(t) > 1]


# --------------------------------------------------------------------------- #
# Documents
# --------------------------------------------------------------------------- #

def job_document(job) -> str:
    return " ".join([
        job.title, job.title,                       # title counts double
        job.description or "", job.requirements or "", job.responsibilities or "",
        " ".join(job.skills or []),
    ])


def candidate_document(candidate) -> str:
    exp = " ".join(
        f"{e.get('title', '')} {e.get('description', '')}"
        for e in (candidate.experience or []) if isinstance(e, dict)
    )
    return " ".join([
        candidate.headline or "", candidate.headline or "",
        candidate.summary or "", exp,
        " ".join(candidate.desired_titles or []),
        " ".join(candidate.skills or []),
    ])


# --------------------------------------------------------------------------- #
# TF-IDF
# --------------------------------------------------------------------------- #

IDF_CACHE_KEY = "jobs:matching:idf:v1"
IDF_CACHE_SECONDS = 60 * 60


def build_idf(force: bool = False) -> dict[str, float]:
    """Inverse document frequency over live jobs. Cached for an hour."""
    if not force:
        cached = cache.get(IDF_CACHE_KEY)
        if cached is not None:
            return cached
    from .models import JobListing
    df: Counter = Counter()
    n = 0
    for job in JobListing.objects.live().only(
            "title", "description", "requirements", "responsibilities", "skills").iterator():
        n += 1
        df.update(set(tokenize(job_document(job))))
    idf = {term: math.log((1 + n) / (1 + freq)) + 1.0 for term, freq in df.items()}
    idf["__default__"] = math.log(1 + n) + 1.0
    cache.set(IDF_CACHE_KEY, idf, IDF_CACHE_SECONDS)
    return idf


def _tfidf(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    if not tokens:
        return {}
    tf = Counter(tokens)
    total = len(tokens)
    default = idf.get("__default__", 1.0)
    return {t: (c / total) * idf.get(t, default) for t, c in tf.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(v * b.get(k, 0.0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def text_similarity(candidate_text: str, job_text: str, idf=None) -> float:
    idf = idf if idf is not None else build_idf()
    return _cosine(_tfidf(tokenize(candidate_text), idf), _tfidf(tokenize(job_text), idf))


# --------------------------------------------------------------------------- #
# Component scores (each 0..1)
# --------------------------------------------------------------------------- #

def skills_score(candidate_skills, job_skills) -> tuple[float, list, list]:
    cand = set(normalise_skills(candidate_skills))
    job = normalise_skills(job_skills)
    if not job:
        return (0.6 if cand else 0.3), [], []   # nothing to compare: neutral
    matched = [s for s in job if s in cand]
    missing = [s for s in job if s not in cand]
    return len(matched) / len(job), matched, missing


def experience_score(candidate_years: int, min_years: int) -> float:
    cy, my = int(candidate_years or 0), int(min_years or 0)
    if my == 0:
        return 1.0 if cy <= 10 else 0.9
    if cy >= my:
        over = cy - my
        return 1.0 if over <= 5 else max(0.75, 1.0 - 0.03 * (over - 5))
    return max(0.0, cy / my) ** 1.5


def preference_score(candidate, job) -> float:
    parts = []
    if candidate.desired_location_types:
        parts.append(1.0 if job.location_type in candidate.desired_location_types else 0.0)
    if candidate.desired_employment_types:
        parts.append(1.0 if job.employment_type in candidate.desired_employment_types else 0.0)
    if candidate.desired_categories:
        parts.append(1.0 if job.category in candidate.desired_categories else 0.3)
    if candidate.desired_salary_min and (job.salary_max or job.salary_min):
        if (candidate.desired_salary_currency or "").upper() == (job.salary_currency or "").upper() \
                and candidate.desired_salary_period == job.salary_period:
            top = job.salary_max or job.salary_min
            want = Decimal(candidate.desired_salary_min)
            parts.append(1.0 if top >= want else max(0.0, float(top / want)) ** 2)
    if job.location_type != "remote" and candidate.country and job.country:
        parts.append(1.0 if candidate.country == job.country
                     else (0.5 if candidate.willing_to_relocate else 0.0))
    return sum(parts) / len(parts) if parts else 0.6


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def score(candidate, job, idf=None) -> dict:
    """Full breakdown for one candidate/job pair."""
    s_skill, matched, missing = skills_score(candidate.skills, job.skills)
    s_text = text_similarity(candidate_document(candidate), job_document(job), idf)
    # raw TF-IDF cosines between a CV and a job ad rarely exceed ~0.5; stretch it
    s_text = min(1.0, s_text * 2.0)
    s_exp = experience_score(candidate.years_experience, job.min_years_experience)
    s_pref = preference_score(candidate, job)
    total = (WEIGHTS["skills"] * s_skill + WEIGHTS["text"] * s_text
             + WEIGHTS["experience"] * s_exp + WEIGHTS["preferences"] * s_pref)
    return {
        "score": int(round(total * 100)),
        "skills": round(s_skill, 3),
        "text": round(s_text, 3),
        "experience": round(s_exp, 3),
        "preferences": round(s_pref, 3),
        "matched_skills": matched,
        "missing_skills": missing,
    }


def recommend_jobs_for(candidate, limit: int = 20, pool: int = 300) -> list[tuple]:
    """Top jobs for a candidate: SQL pre-filter, then rank in Python."""
    from django.db.models import Q

    from .models import JobListing

    qs = JobListing.objects.live().select_related("employer").exclude(
        applications__candidate=candidate)
    skills = normalise_skills(candidate.skills)[:10]
    pre = Q()
    for s in skills:
        pre |= Q(skills_text__icontains=s)
    for t in (candidate.desired_titles or [])[:5]:
        pre |= Q(title__icontains=t)
    if candidate.headline:
        for word in tokenize(candidate.headline)[:4]:
            pre |= Q(title__icontains=word)
    if pre:
        qs = qs.filter(pre)
    if candidate.desired_categories:
        qs = qs.order_by(
            # jobs in wanted categories first, then newest
            _in_list("category", candidate.desired_categories).desc(), "-published_at")
    else:
        qs = qs.order_by("-published_at")

    idf = build_idf()
    ranked = [(job, score(candidate, job, idf)) for job in qs[:pool]]
    ranked.sort(key=lambda x: x[1]["score"], reverse=True)
    return ranked[:limit]


def recommend_candidates_for(job, limit: int = 20, pool: int = 400) -> list[tuple]:
    """Top searchable candidates for a job (employer 'smart matches')."""
    from django.db.models import Q

    from .models import CandidateProfile

    qs = CandidateProfile.objects.filter(is_searchable=True, open_to_work=True) \
        .select_related("user").exclude(applications__job=job) \
        .exclude(user_id=job.employer.owner_id)
    pre = Q()
    for s in normalise_skills(job.skills)[:10]:
        pre |= Q(skills_text__icontains=s)
    for word in tokenize(job.title)[:4]:
        pre |= Q(headline__icontains=word)
    if pre:
        qs = qs.filter(pre)

    idf = build_idf()
    ranked = [(c, score(c, job, idf)) for c in qs.order_by("-updated_at")[:pool]]
    ranked.sort(key=lambda x: x[1]["score"], reverse=True)
    return ranked[:limit]


def _in_list(field, values):
    from django.db.models import Case, IntegerField, Value, When
    return Case(When(**{f"{field}__in": values}, then=Value(1)),
                default=Value(0), output_field=IntegerField())


# --------------------------------------------------------------------------- #
# UPGRADE PATH — semantic embeddings with pgvector
# --------------------------------------------------------------------------- #
# 1. `CREATE EXTENSION vector;` and `pip install pgvector`.
# 2. Add `embedding = VectorField(dimensions=1024, null=True)` to JobListing and
#    CandidateProfile, filled by a Celery task whenever the text changes, using
#    any embeddings API (or a local sentence-transformers model).
# 3. Replace the SQL pre-filter with
#       JobListing.objects.live().order_by(CosineDistance("embedding", cand.embedding))[:pool]
#    and replace `text_similarity()` with `1 - cosine_distance`.
# 4. Keep skills/experience/preferences as-is: they stay explainable and stop
#    the model from recommending a senior role to a graduate because the
#    wording was similar.
