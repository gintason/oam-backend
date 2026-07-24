"""Messaging endpoints. Every one is scoped to the signed-in participant."""
from __future__ import annotations

from django.db import models as dj_models
from django.db.models import Q
from django.utils import timezone
from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


def _mine(user):
    """Threads this user belongs to — the only ones they may ever see."""
    return Conversation.objects.filter(
        Q(customer=user) | Q(provider=user)
    ).select_related("listing", "artisan", "customer", "provider")


class ConversationListView(APIView):
    """GET  /messaging/conversations/    POST /messaging/conversations/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.query_params.get("role")
        qs = _mine(request.user)
        if role == "customer":
            qs = qs.filter(customer=request.user)
        elif role == "provider":
            qs = qs.filter(provider=request.user)

        data = ConversationSerializer(qs, many=True, context={"user": request.user}).data
        unread = sum(c["unread"] for c in data)
        return Response({"count": len(data), "unread": unread, "results": data})

    def post(self, request):
        """
        Start (or reopen) a thread about a listing or an artisan.

        Re-enquiring about the same item returns the EXISTING thread rather than
        creating a duplicate — otherwise a provider's inbox fills with repeated
        threads from one person about one item.
        """
        kind = (request.data.get("kind") or "").lower()
        subject_id = request.data.get("id") or request.data.get("subject_id")
        body = (request.data.get("body") or "").strip()

        if kind not in (Conversation.Kind.LISTING, Conversation.Kind.ARTISAN):
            return Response({"detail": "kind must be 'listing' or 'artisan'."},
                            status=http.HTTP_400_BAD_REQUEST)
        if not subject_id:
            return Response({"detail": "Missing subject id."}, status=http.HTTP_400_BAD_REQUEST)
        if not body:
            return Response({"detail": "Write a message to send."},
                            status=http.HTTP_400_BAD_REQUEST)

        listing = artisan = None
        if kind == Conversation.Kind.LISTING:
            from apps.marketplace.models import Listing
            listing = Listing.objects.filter(id=subject_id).select_related("seller").first()
            if listing is None:
                return Response({"detail": "Listing not found."}, status=http.HTTP_404_NOT_FOUND)
            provider = listing.seller
            lookup = {"listing": listing, "customer": request.user}
        else:
            from apps.homeservices.models import ArtisanProfile
            artisan = ArtisanProfile.objects.filter(id=subject_id).select_related("user").first()
            if artisan is None:
                return Response({"detail": "Artisan not found."}, status=http.HTTP_404_NOT_FOUND)
            provider = artisan.user
            lookup = {"artisan": artisan, "customer": request.user}

        if provider == request.user:
            return Response({"detail": "This is your own listing."},
                            status=http.HTTP_400_BAD_REQUEST)

        convo, _created = Conversation.objects.get_or_create(
            **lookup,
            defaults={"kind": kind, "provider": provider,
                      "listing": listing, "artisan": artisan},
        )

        Message.objects.create(conversation=convo, sender=request.user, body=body[:4000])
        convo.last_message_at = timezone.now()
        convo.save(update_fields=["last_message_at", "updated_at"])

        return Response(
            ConversationSerializer(convo, context={"user": request.user}).data,
            status=http.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
    """GET /messaging/conversations/<id>/ — thread + messages, marks as read."""

    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        convo = _mine(request.user).filter(id=conversation_id).first()
        if convo is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        convo.messages.filter(read_at__isnull=True).exclude(sender=request.user) \
             .update(read_at=timezone.now())

        return Response({
            "conversation": ConversationSerializer(convo, context={"user": request.user}).data,
            "messages": MessageSerializer(convo.messages.all(), many=True,
                                          context={"user": request.user}).data,
        })


class MessageCreateView(APIView):
    """POST /messaging/conversations/<id>/messages/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        convo = _mine(request.user).filter(id=conversation_id).first()
        if convo is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        if convo.status == Conversation.Status.CLOSED:
            return Response({"detail": "This conversation is closed."},
                            status=http.HTTP_400_BAD_REQUEST)

        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "Write a message to send."},
                            status=http.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(conversation=convo, sender=request.user, body=body[:4000])
        convo.last_message_at = timezone.now()
        convo.save(update_fields=["last_message_at", "updated_at"])
        return Response(MessageSerializer(msg, context={"user": request.user}).data,
                        status=http.HTTP_201_CREATED)


class ConversationActionView(APIView):
    """
    POST /messaging/conversations/<id>/<action>/  — accept | decline | close

    ACCEPT is the moment contacts become visible to both sides, so only the
    PROVIDER may do it: it represents them agreeing to the job or sale. A
    customer accepting their own enquiry would hand them a phone number the
    provider never agreed to share.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id, action):
        convo = _mine(request.user).filter(id=conversation_id).first()
        if convo is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        if action in ("accept", "decline") and convo.provider_id != request.user.id:
            return Response({"detail": "Only the seller or artisan can do that."},
                            status=http.HTTP_403_FORBIDDEN)

        if action == "accept":
            convo.accept()
        elif action == "decline":
            convo.status = Conversation.Status.DECLINED
            convo.save(update_fields=["status", "updated_at"])
        elif action == "close":
            convo.status = Conversation.Status.CLOSED
            convo.save(update_fields=["status", "updated_at"])
        else:
            return Response({"detail": "Unknown action."}, status=http.HTTP_400_BAD_REQUEST)

        return Response(ConversationSerializer(convo, context={"user": request.user}).data)


class UnreadCountView(APIView):
    """GET /messaging/unread/ — for the header badge."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__in=_mine(request.user), read_at__isnull=True,
        ).exclude(sender=request.user).count()
        return Response({"unread": count})
