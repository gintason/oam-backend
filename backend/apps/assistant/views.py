"""Assistant endpoints."""
from __future__ import annotations

from django.core.cache import cache
from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .knowledge import GREETING
from .service import _llm_configured, answer

MAX_QUESTION_CHARS = 1500
HOURLY_LIMIT = 40


class AssistantChatView(APIView):
    """
    POST /assistant/chat/
        {"question": "...", "history": [{"role":"user"|"assistant","content":"..."}]}

    History is sent by the client rather than stored server-side. Conversations
    here are transient help, not records worth keeping — and not storing them
    means there's no archive of customers' questions to secure or leak.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = (request.data.get("question") or "").strip()
        if not question:
            return Response({"detail": "Ask me something."}, status=http.HTTP_400_BAD_REQUEST)
        if len(question) > MAX_QUESTION_CHARS:
            return Response(
                {"detail": "That's a bit long — try asking in a sentence or two."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        # Per-user hourly cap. The LLM path costs money per message, and an
        # uncapped endpoint is an uncapped bill.
        key = f"assistant:{request.user.id}"
        used = cache.get(key, 0)
        if used >= HOURLY_LIMIT:
            return Response(
                {"detail": "You've asked a lot of questions in the last hour. Try again "
                           "shortly, or email info@oam-app.com."},
                status=http.HTTP_429_TOO_MANY_REQUESTS,
            )
        cache.set(key, used + 1, 3600)

        raw_history = request.data.get("history") or []
        history = [
            {"role": m["role"], "content": str(m["content"])[:2000]}
            for m in raw_history[-10:]
            if isinstance(m, dict) and m.get("role") in ("user", "assistant") and m.get("content")
        ]

        reply, mode = answer(history, question)
        return Response({"reply": reply, "mode": mode})


class AssistantStatusView(APIView):
    """GET /assistant/status/ — what the client should expect."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "available": True,
            "mode": "ai" if _llm_configured() else "knowledge-base",
            "greeting": GREETING,
            "suggestions": [
                "Where is my electricity token?",
                "Why did my card payment go into my wallet?",
                "How many items can I list for free?",
                "How do I get verified as an artisan?",
            ],
        })
