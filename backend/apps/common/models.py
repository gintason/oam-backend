"""
Reusable base models shared across every domain app.

These are abstract — they create no tables themselves. Domain apps inherit
from them so behaviour (UUID PKs, timestamps, immutability) stays consistent.
"""
import uuid

from django.core.exceptions import PermissionDenied
from django.db import models


class TimeStampedModel(models.Model):
    """Adds self-managing created/updated timestamps."""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Uses a non-sequential UUID primary key (for sensitive / financial rows)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class ImmutableModel(models.Model):
    """
    Append-only base for ledger / audit rows.

    Rows may be created but never updated or deleted through the ORM. The
    correct way to 'change' an immutable record is to write a new, reversing
    record. DB-level UPDATE/DELETE revocation should back this up in prod.
    """
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise PermissionDenied(
                "This record is immutable; create a reversing entry instead."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Immutable records cannot be deleted.")
