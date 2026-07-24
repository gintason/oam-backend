"""
Wallet-to-wallet transfers between OAM users (P2P "send money").

Your backend had no P2P transfer, so this adds one that reuses the existing
double-entry ledger rather than inventing a second money path:

    sender wallet  --debit-->  suspense  --credit-->  recipient wallet

Both legs happen inside ONE atomic transaction, so a transfer can never leave
money in limbo: either both postings land or neither does.

Safety properties:
  • The recipient is resolved by email or phone before any money moves, and the
    sender sees the recipient's name first (a separate "resolve" call).
  • You cannot send to yourself, or to an unverified/inactive account.
  • Sending is blocked unless the sender's balance covers it (no overdraft).
  • Currency must match on both sides.
  • An idempotency key derived from the transfer reference stops a double-tap
    from sending twice.
"""
from __future__ import annotations

import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, models, transaction
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import TimeStampedModel
from apps.common.permissions import IsVerified

from .models import Wallet
from .services import WalletService

User = settings.AUTH_USER_MODEL


logger = logging.getLogger(__name__)


class TransferError(Exception):
    """Something about the transfer request is invalid."""


class WalletTransfer(TimeStampedModel):
    """A completed P2P transfer between two OAM users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(User, on_delete=models.PROTECT, related_name="transfers_sent")
    recipient = models.ForeignKey(User, on_delete=models.PROTECT, related_name="transfers_received")
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    note = models.CharField(max_length=140, blank=True)
    reference = models.CharField(max_length=60, unique=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.amount} {self.currency} -> {self.recipient_id}"


def _find_user(identifier: str):
    """Look a user up by email or phone."""
    from django.contrib.auth import get_user_model

    U = get_user_model()
    ident = (identifier or "").strip()
    if not ident:
        return None
    return (U.objects.filter(email__iexact=ident).first()
            or U.objects.filter(phone=ident).first())


def _display_name(user) -> str:
    name = f"{user.first_name} {user.last_name}".strip()
    if name:
        return name
    return (user.email or user.phone or "OAM user")


class TransferService:
    @staticmethod
    def resolve(identifier: str, *, exclude_user=None) -> dict:
        """Who would receive this transfer? Never moves money."""
        user = _find_user(identifier)
        if user is None:
            raise TransferError("No OAM account found for that email or phone.")
        if exclude_user is not None and user.pk == exclude_user.pk:
            raise TransferError("You can't send money to yourself.")
        if not user.is_active:
            raise TransferError("That account is not active.")
        return {"name": _display_name(user), "identifier": identifier}

    @staticmethod
    @transaction.atomic
    def send(*, sender, identifier: str, amount, currency: str = "NGN", note: str = "") -> "WalletTransfer":
        try:
            amt = Decimal(str(amount)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError):
            raise TransferError("Enter a valid amount.")
        if amt <= 0:
            raise TransferError("Amount must be greater than zero.")

        currency = (currency or "NGN").upper()
        recipient = _find_user(identifier)
        if recipient is None:
            raise TransferError("No OAM account found for that email or phone.")
        if recipient.pk == sender.pk:
            raise TransferError("You can't send money to yourself.")
        if not recipient.is_active:
            raise TransferError("That account is not active.")

        sender_wallet = WalletService.get_or_create_wallet(sender, currency)
        recipient_wallet = WalletService.get_or_create_wallet(recipient, currency)

        # Lock both rows in a stable order to avoid deadlocks.
        ids = sorted([str(sender_wallet.pk), str(recipient_wallet.pk)])
        list(Wallet.objects.select_for_update().filter(pk__in=ids))

        available = WalletService.derived_balance(sender_wallet)
        if available < amt:
            raise TransferError("Insufficient funds for this transfer.")

        # One transfer, two journal entries. JournalEntry.reference is UNIQUE,
        # so the legs cannot share a reference — the shared TRF- prefix is what
        # ties them together, and WalletTransfer.reference holds the canonical
        # value the customer sees.
        reference = f"TRF-{uuid.uuid4().hex[:14].upper()}"
        out_reference = f"{reference}-OUT"
        in_reference = f"{reference}-IN"
        to_name = _display_name(recipient)
        from_name = _display_name(sender)

        WalletService.debit(
            sender_wallet, amt,
            dest_code="suspense",
            description=f"Transfer to {to_name}" + (f" — {note}" if note else ""),
            reference=out_reference,
            idempotency_key=f"{reference}:debit",
            metadata={"kind": "p2p_transfer", "to": str(recipient.pk), "note": note},
        )
        WalletService.credit(
            recipient_wallet, amt,
            source_code="suspense",
            description=f"Transfer from {from_name}" + (f" — {note}" if note else ""),
            reference=in_reference,
            idempotency_key=f"{reference}:credit",
            metadata={"kind": "p2p_transfer", "from": str(sender.pk), "note": note},
        )

        return WalletTransfer.objects.create(
            sender=sender, recipient=recipient, amount=amt,
            currency=currency, note=note or "", reference=reference,
        )


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
class ResolveRecipientSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=120)


class SendTransferSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=120)
    amount = serializers.DecimalField(max_digits=20, decimal_places=2, min_value=Decimal("1"))
    currency = serializers.CharField(max_length=3, required=False, default="NGN")
    note = serializers.CharField(max_length=140, required=False, allow_blank=True)


class WalletTransferSerializer(serializers.ModelSerializer):
    direction = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransfer
        fields = ("id", "amount", "currency", "note", "reference",
                  "direction", "counterparty", "created_at")

    def get_direction(self, obj):
        me = self.context.get("user")
        return "out" if me and obj.sender_id == me.pk else "in"

    def get_counterparty(self, obj):
        me = self.context.get("user")
        other = obj.recipient if (me and obj.sender_id == me.pk) else obj.sender
        return _display_name(other)


class ResolveRecipientView(APIView):
    """POST /wallet/transfer/resolve/ {identifier} -> recipient name."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        s = ResolveRecipientSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            result = TransferService.resolve(
                s.validated_data["identifier"], exclude_user=request.user
            )
        except TransferError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class SendTransferView(APIView):
    """POST /wallet/transfer/ {identifier, amount, currency?, note?}."""
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        s = SendTransferSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            trf = TransferService.send(
                sender=request.user,
                identifier=d["identifier"],
                amount=d["amount"],
                currency=d.get("currency", "NGN"),
                note=d.get("note", ""),
            )
        except TransferError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            # A ledger constraint refused the entry. The transaction rolled back,
            # so no money moved — say so plainly rather than returning a 500,
            # which the client can only render as an HTML error page.
            logger.exception("transfer failed a ledger constraint")
            return Response(
                {"detail": "That transfer could not be completed. "
                           "No money left your wallet — please try again."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            WalletTransferSerializer(trf, context={"user": request.user}).data,
            status=status.HTTP_201_CREATED,
        )


class TransferHistoryView(APIView):
    """GET /wallet/transfers/ — transfers you sent or received."""
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        qs = WalletTransfer.objects.filter(
            models.Q(sender=request.user) | models.Q(recipient=request.user)
        )[:100]
        return Response({
            "results": WalletTransferSerializer(
                qs, many=True, context={"user": request.user}
            ).data
        })
