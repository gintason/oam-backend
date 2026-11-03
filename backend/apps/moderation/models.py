"""
Reports and blocks for user-generated content (App Store guideline 1.2).

  Report — a user flags a listing, artisan, comment, message or person.
           Staff review it in the admin; ops get an email straight away.
  Block  — a user stops seeing another user: their listings, artisans,
           comments and chats disappear, and neither can message the other.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Report(TimeStampedModel):
    class Target(models.TextChoices):
        LISTING = "listing", "Marketplace listing"
        ARTISAN = "artisan", "Artisan"
        COMMENT = "comment", "Comment"
        CONVERSATION = "conversation", "Chat"
        JOBCHAT = "jobchat", "Jobs chat"
        MESSAGE = "message", "Message"
        USER = "user", "User"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACTIONED = "actioned", "Content removed / user actioned"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="reports_made")
    target_type = models.CharField(max_length=16, choices=Target.choices)
    target_id = models.CharField(max_length=64)
    # The person responsible for the content (if known) — makes review quick.
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                      on_delete=models.SET_NULL, related_name="reports_received")
    reason = models.CharField(max_length=40)
    details = models.TextField(blank=True, max_length=1000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    staff_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_target_type_display()} {self.target_id} · {self.reason}"


class Block(TimeStampedModel):
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="blocks_made")
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="blocked_by")

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["blocker", "blocked"],
                                               name="uniq_block_pair")]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"
