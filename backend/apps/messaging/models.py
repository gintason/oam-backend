"""
In-app messaging between customers and providers (sellers or artisans).

ONE SYSTEM, TWO VERTICALS
  Marketplace and Home Services need the same thing: a private thread between
  the person who wants something and the person offering it. Building it twice
  would mean two schemas, two APIs and two chat UIs to keep in step, so a
  Conversation simply points at EITHER a Listing or an ArtisanProfile.

WHY CONTACTS ARE HIDDEN UNTIL A JOB IS ACCEPTED
  Phone numbers in public profiles get scraped, and in this market that means
  WhatsApp scams and impersonation. It also lets both sides step off-platform
  the moment they connect — taking your commission with them.

  So contacts live behind an explicit acceptance: the provider accepts the
  enquiry, and only then do both parties see each other's number. That keeps
  the introduction inside OAM, gives you a record that the connection happened,
  and gives the customer a provider who has actually agreed to the work.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Conversation(TimeStampedModel):
    """A private thread about one listing or one artisan."""

    class Kind(models.TextChoices):
        LISTING = "listing", "Marketplace listing"
        ARTISAN = "artisan", "Artisan service"

    class Status(models.TextChoices):
        OPEN = "open", "Open"              # enquiry made, contacts hidden
        ACCEPTED = "accepted", "Accepted"  # provider agreed — contacts shared
        DECLINED = "declined", "Declined"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=16, choices=Kind.choices)

    listing = models.ForeignKey(
        "marketplace.Listing", null=True, blank=True,
        on_delete=models.CASCADE, related_name="conversations",
    )
    artisan = models.ForeignKey(
        "homeservices.ArtisanProfile", null=True, blank=True,
        on_delete=models.CASCADE, related_name="conversations",
    )

    # customer = the person enquiring; provider = seller or artisan
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="conversations_started",
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="conversations_received",
    )

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    accepted_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_message_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "customer"],
                condition=models.Q(kind="listing"),
                name="uniq_listing_customer_thread",
            ),
            models.UniqueConstraint(
                fields=["artisan", "customer"],
                condition=models.Q(kind="artisan"),
                name="uniq_artisan_customer_thread",
            ),
        ]

    def __str__(self):
        return f"{self.kind} · {self.customer} ↔ {self.provider}"

    # -- helpers ---------------------------------------------------------- #

    @property
    def contacts_visible(self) -> bool:
        """Numbers are exchanged only once the provider has accepted."""
        return self.status == self.Status.ACCEPTED

    def other_party(self, user):
        return self.provider if user == self.customer else self.customer

    def subject_title(self) -> str:
        if self.kind == self.Kind.LISTING and self.listing_id:
            return self.listing.title
        if self.kind == self.Kind.ARTISAN and self.artisan_id:
            return self.artisan.business_name or "Artisan service"
        return "Conversation"

    def accept(self):
        """Provider agrees to the job/sale — this is what reveals contacts."""
        if self.status != self.Status.OPEN:
            return self
        self.status = self.Status.ACCEPTED
        self.accepted_at = timezone.now()
        self.save(update_fields=["status", "accepted_at", "updated_at"])
        return self


class Message(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent",
    )
    body = models.TextField(max_length=4000)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender}: {self.body[:40]}"
