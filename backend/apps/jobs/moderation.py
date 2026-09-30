"""
Duplicate and scam detection for job listings.

Recruitment scams in this market follow a pattern: "pay a registration fee",
"contact us on WhatsApp only", absurd salaries for no experience, and the same
advert posted by several fresh accounts. Each signal adds to a risk score;
above FLAG_THRESHOLD the listing is flagged for staff, above HOLD_THRESHOLD it
is held in PENDING_REVIEW instead of going live.

Nothing here deletes anything — it only flags. A human makes the final call in
the Django admin (JobFlag).
"""
from __future__ import annotations

import hashlib
import re
from decimal import Decimal

from django.conf import settings

FLAG_THRESHOLD = getattr(settings, "JOBS_FLAG_THRESHOLD", 40)
HOLD_THRESHOLD = getattr(settings, "JOBS_HOLD_THRESHOLD", 70)

SCAM_PHRASES = {
    "registration fee": 35, "application fee": 35, "processing fee": 35,
    "training fee": 30, "pay to apply": 40, "upfront payment": 35,
    "refundable deposit": 30, "send money": 30, "western union": 30,
    "moneygram": 30, "gift card": 25, "bitcoin": 20, "crypto payment": 20,
    "whatsapp only": 20, "telegram only": 20, "contact on telegram": 15,
    "no interview": 15, "no experience needed, earn": 20, "earn daily": 15,
    "work from home and earn": 15, "guaranteed income": 20, "get rich": 25,
    "visa sponsorship guaranteed": 20, "100% guaranteed": 15,
}
SHORTENERS = ("bit.ly", "tinyurl", "t.co/", "goo.gl", "rb.gy", "cutt.ly", "is.gd")
FREE_MAIL = ("@gmail.", "@yahoo.", "@hotmail.", "@outlook.", "@aol.", "@ymail.")

# Salary sanity per currency and period — above these for an entry-level role
# is a red flag. Deliberately generous.
_SALARY_CEILINGS = {
    ("NGN", "month"): Decimal("5000000"), ("NGN", "year"): Decimal("60000000"),
    ("USD", "month"): Decimal("30000"), ("USD", "year"): Decimal("400000"),
    ("GBP", "month"): Decimal("25000"), ("GBP", "year"): Decimal("300000"),
    ("EUR", "month"): Decimal("28000"), ("EUR", "year"): Decimal("350000"),
}


def _normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def content_hash(job) -> str:
    """Stable fingerprint of what the job SAYS (not who posted it)."""
    body = _normalise(job.description)[:1500]
    return hashlib.sha1(f"{_normalise(job.title)}|{body}".encode()).hexdigest()


def assess(job) -> tuple[int, list[str]]:
    """Return (risk_score 0..100, reasons). Pure: no DB writes."""
    score, reasons = 0, []
    text = " ".join([job.title or "", job.description or "", job.requirements or "",
                     job.benefits or ""]).lower()

    for phrase, weight in SCAM_PHRASES.items():
        if phrase in text:
            score += weight
            reasons.append(f"Contains '{phrase}'")

    if any(s in text or s in (job.external_apply_url or "") for s in SHORTENERS):
        score += 15
        reasons.append("Uses a link shortener")

    if not job.employer.is_verified and any(m in text for m in FREE_MAIL):
        score += 10
        reasons.append("Unverified employer asks for replies to a free email address")

    letters = [c for c in (job.title or "") if c.isalpha()]
    if len(letters) > 8 and sum(c.isupper() for c in letters) / len(letters) > 0.8:
        score += 5
        reasons.append("Title is in capitals")

    if job.salary_min and job.salary_max and job.salary_min > 0 \
            and job.salary_max / job.salary_min > 10:
        score += 10
        reasons.append("Salary range is implausibly wide")

    ceiling = _SALARY_CEILINGS.get(((job.salary_currency or "").upper(), job.salary_period))
    top = job.salary_max or job.salary_min
    if ceiling and top and top > ceiling and job.experience_level in ("entry", "mid"):
        score += 20
        reasons.append("Salary far above market for the experience level")

    if len((job.description or "").strip()) < 80:
        score += 10
        reasons.append("Very short description")

    return min(score, 100), reasons


def find_duplicates(job):
    """Other listings with identical content that are live or recent."""
    from .models import JobListing
    if not job.content_hash:
        return JobListing.objects.none()
    return (JobListing.objects
            .filter(content_hash=job.content_hash)
            .exclude(pk=job.pk)
            .exclude(status__in=[JobListing.Status.DRAFT, JobListing.Status.REJECTED])
            .select_related("employer"))


def screen(job, *, save: bool = True) -> dict:
    """
    Score a listing, record flags, and say whether it should be held.

    Same employer re-posting the same advert → DUPLICATE (they should renew the
    old one instead). Different employers with identical text → SUSPICIOUS:
    that's how scam rings copy real adverts.
    """
    from .models import JobFlag

    job.content_hash = content_hash(job)
    risk, reasons = assess(job)

    dup_same, dup_other = [], []
    for other in find_duplicates(job)[:5]:
        (dup_same if other.employer_id == job.employer_id else dup_other).append(other)
    if dup_same:
        reasons.append("Same advert already posted by this employer")
        risk = max(risk, FLAG_THRESHOLD)
    if dup_other:
        reasons.append("Identical advert posted by a different employer")
        risk = min(100, risk + 40)

    job.risk_score = risk
    job.is_flagged = risk >= FLAG_THRESHOLD
    hold = risk >= HOLD_THRESHOLD

    if save:
        job.save(update_fields=["content_hash", "risk_score", "is_flagged", "updated_at"])
        open_flags = JobFlag.objects.filter(job=job, resolved=False)
        for other in dup_same:
            if not open_flags.filter(kind=JobFlag.Kind.DUPLICATE, related_job=other).exists():
                JobFlag.objects.create(job=job, kind=JobFlag.Kind.DUPLICATE, related_job=other,
                                       score=risk, reason="Same advert already posted by "
                                                          "this employer")
        for other in dup_other:
            if not open_flags.filter(kind=JobFlag.Kind.SUSPICIOUS, related_job=other).exists():
                JobFlag.objects.create(job=job, kind=JobFlag.Kind.SUSPICIOUS, related_job=other,
                                       score=risk, reason="Identical advert posted by "
                                                          f"{other.employer.company_name}")
        content_reasons = [r for r in reasons if "advert" not in r]
        if job.is_flagged and content_reasons and not open_flags.filter(
                kind=JobFlag.Kind.SUSPICIOUS, related_job__isnull=True).exists():
            JobFlag.objects.create(job=job, kind=JobFlag.Kind.SUSPICIOUS, score=risk,
                                   reason="; ".join(content_reasons)[:500])

    return {"risk_score": risk, "reasons": reasons, "hold": hold,
            "duplicates": [str(j.pk) for j in dup_same + dup_other]}
