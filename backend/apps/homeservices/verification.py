"""
Artisan verification: documents in, automated checks, then a human decision.

THE SHAPE OF THIS, AND WHY
  An artisan uploads photos of their work, a short video, and an identity
  document. Automated checks confirm the submission is complete and legible —
  right format, big enough to read, video long enough to show something real.

  Passing those checks does NOT grant the Verified badge. It moves the artisan
  into a review queue and lets them appear in search immediately, so they can
  start taking work while they wait.

  The badge is granted by a person, because no automated check can tell whether
  an identity document is genuine or belongs to the uploader — a photo of
  someone else's ID taken off a screen passes every technical test there is.
  Customers read "Verified" as "somebody checked", and they use it to decide
  whether to let a stranger into their home. Granting it automatically would
  make it a decoration that increases risk rather than reducing it.

  Only Verified artisans reach Featured on the landing page.

IDENTITY DOCUMENTS
  Stored with Cloudinary "authenticated" delivery, so holding the id isn't
  enough to open one. Never included in any public serializer. Admins view them
  through short-lived signed links, and the raw reference is dropped once a
  decision is made and the retention window passes.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel

from .models import ArtisanProfile


class ArtisanVerification(TimeStampedModel):
    """One verification submission per artisan."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Not submitted"
        INCOMPLETE = "incomplete", "Checks failed"
        PENDING = "pending", "Awaiting review"
        APPROVED = "approved", "Verified"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artisan = models.OneToOneField(
        ArtisanProfile, on_delete=models.CASCADE, related_name="verification"
    )

    # Cloudinary public_ids, not URLs — a URL can be forged, and we always
    # re-read the asset from Cloudinary before trusting anything about it.
    work_video_id = models.CharField(max_length=255, blank=True)
    id_document_id = models.CharField(max_length=255, blank=True)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)

    # What the automated checks found, kept so a reviewer sees the same facts.
    checks_report = models.JSONField(default=dict, blank=True)
    checks_passed_at = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="artisan_reviews",
    )
    decision_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-submitted_at", "-created_at"]

    def __str__(self):
        return f"{self.artisan.business_name} [{self.status}]"

    @property
    def service_image_count(self) -> int:
        return self.artisan.service_images.count()

    @property
    def is_complete(self) -> bool:
        """Everything present. Says nothing about whether it's genuine."""
        return bool(
            self.work_video_id
            and self.id_document_id
            and self.service_image_count >= MIN_SERVICE_IMAGES
        )


class ArtisanServiceImage(TimeStampedModel):
    """A photo of completed work. Public — this is the artisan's shop window."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artisan = models.ForeignKey(
        ArtisanProfile, on_delete=models.CASCADE, related_name="service_images"
    )
    public_id = models.CharField(max_length=255)
    url = models.URLField(max_length=500)
    caption = models.CharField(max_length=140, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.artisan.business_name} image"


MIN_SERVICE_IMAGES = 2
MAX_SERVICE_IMAGES = 8
