"""
POST   /moderation/reports/              report an item
GET    /moderation/blocks/               people I blocked
POST   /moderation/blocks/               block {user_id} or the owner of {target_type, target_id}
DELETE /moderation/blocks/<user_id>/     unblock
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Block, Report
from .services import alert_staff, resolve_target

REASONS = {"spam", "scam", "offensive", "harassment", "prohibited", "fake", "other"}


def _owner_of(request, target_type, target_id):
    """The person behind an item. For a chat, it's the other participant."""
    if target_type == "conversation":
        from django.db.models import Q
        from apps.messaging.models import Conversation
        try:
            c = Conversation.objects.filter(
                Q(customer=request.user) | Q(provider=request.user), id=target_id,
            ).select_related("customer", "provider").first()
        except Exception:  # malformed id
            c = None
        return (c is not None, c.other_party(request.user) if c else None)
    if target_type == "jobchat":
        from apps.jobs.models import ChatThread
        try:
            t = ChatThread.objects.select_related("employer__owner", "candidate__user").filter(
                id=target_id).first()
        except Exception:
            t = None
        if t is None or not t.is_participant(request.user):
            return (False, None)
        owner = t.candidate.user if t.employer.owner_id == request.user.id else t.employer.owner
        return (True, owner)
    return resolve_target(target_type, target_id)


def _name(u):
    return (u.get_full_name() or u.first_name or "O.A.M user") if u else ""


def _do_block(blocker, blocked):
    Block.objects.get_or_create(blocker=blocker, blocked=blocked)


class ReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        d = request.data
        target_type = (d.get("target_type") or "").lower()
        target_id = str(d.get("target_id") or "").strip()
        reason = (d.get("reason") or "other").lower()
        if target_type not in Report.Target.values or not target_id:
            return Response({"detail": "Tell us what you are reporting."},
                            status=http.HTTP_400_BAD_REQUEST)
        if reason not in REASONS:
            reason = "other"
        exists, owner = _owner_of(request, target_type, target_id)
        if not exists:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        if owner is not None and owner.id == request.user.id:
            return Response({"detail": "You can't report your own content."},
                            status=http.HTTP_400_BAD_REQUEST)

        report = Report.objects.create(
            reporter=request.user, target_type=target_type, target_id=target_id,
            reported_user=owner, reason=reason,
            details=(d.get("details") or "")[:1000],
        )
        blocked = False
        if d.get("block") and owner is not None:
            _do_block(request.user, owner)
            blocked = True
        alert_staff(report)
        return Response({"ok": True, "blocked": blocked,
                         "detail": "Thanks — our team will review this within 24 hours."},
                        status=http.HTTP_201_CREATED)


class BlockListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = Block.objects.filter(blocker=request.user).select_related("blocked")
        return Response({"results": [
            {"user_id": str(b.blocked_id), "name": _name(b.blocked),
             "created_at": b.created_at} for b in rows]})

    def post(self, request):
        d = request.data
        user_id = d.get("user_id")
        if user_id:
            try:
                target = get_user_model().objects.filter(id=user_id).first()
            except Exception:  # malformed id
                target = None
        else:
            target_type = (d.get("target_type") or "").lower()
            _, target = _owner_of(request, target_type, str(d.get("target_id") or ""))
        if target is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response({"detail": "You can't block yourself."},
                            status=http.HTTP_400_BAD_REQUEST)
        _do_block(request.user, target)
        return Response({"ok": True, "user_id": str(target.id), "name": _name(target),
                         "detail": f"{_name(target)} is blocked. You won't see their "
                                   "listings or messages."},
                        status=http.HTTP_201_CREATED)


class BlockDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        Block.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        return Response(status=http.HTTP_204_NO_CONTENT)
