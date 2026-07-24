"""
Answering questions — with a language model when one is configured, from the
knowledge base when not.

WHY IT WORKS BOTH WAYS
  A capable assistant needs an LLM, and that's a per-message cost. Building the
  fallback means OAM can ship the feature now, answer the questions people
  actually ask, and switch the paid part on whenever it suits — without the
  button appearing broken in the meantime.

THE THING THIS MUST NOT DO
  People will ask "where is my money" and "why did my payment fail". The
  assistant cannot see account data, and an invented answer about someone's
  balance is worse than no assistant at all. So the system prompt says so
  plainly, and the fallback has a dedicated response for account questions that
  points at the pages which do know.
"""
from __future__ import annotations

import logging
import re

import requests
from django.conf import settings

from .knowledge import (
    CANT_SEE_ACCOUNT,
    FAQS,
    GREETING,
    NO_MATCH,
    PLATFORM_FACTS,
    WHERE_TO_GO,
)

logger = logging.getLogger("assistant")

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
MODEL = getattr(settings, "ASSISTANT_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = 700

SYSTEM_PROMPT = f"""You are the OAM assistant, helping people use the OAM platform.

{PLATFORM_FACTS}

{WHERE_TO_GO}

HOW TO BEHAVE

You cannot see the user's account. You do not know their balance, their orders,
their transactions, or whether a specific payment succeeded. If they ask about
anything specific to their account, say so plainly and point them to Order
history (/orders) or Wallet (/wallet), and to info@oam-app.com if something
looks wrong. Never guess at a figure, a status or a date.

Never invent a policy, a fee, a refund rule or a delivery time. If the facts
above don't cover something, say you're not certain and point to /help or
info@oam-app.com. Being wrong about money costs the user real money and costs
OAM their trust.

The single most important thing you can tell someone whose electricity token
hasn't arrived is: do not buy again. The payment has gone through, and a second
purchase charges them twice for the same meter.

You are not a financial adviser or a lawyer. Don't advise on investments, tax or
legal questions — say it's outside what you can help with.

You can answer general questions unrelated to OAM, briefly and helpfully. But if
someone seems to be asking about their own money or an order, bring them back to
the pages that actually know.

TONE
Warm, direct and brief. Two or three short paragraphs at most. Plain language,
no jargon, no exclamation marks. Write like a knowledgeable colleague, not a
support script. Don't open with "Great question" or similar filler.

OAM serves customers internationally, so don't assume where someone is unless
they tell you."""


def _llm_configured() -> bool:
    return bool(getattr(settings, "ANTHROPIC_API_KEY", ""))


def _ask_llm(messages: list[dict]) -> str | None:
    """Returns None on any failure, so the caller can fall back rather than fail."""
    try:
        response = requests.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": MODEL,
                "max_tokens": MAX_TOKENS,
                "system": SYSTEM_PROMPT,
                "messages": messages,
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        logger.warning("assistant: request failed — %s", exc)
        return None

    if response.status_code != 200:
        logger.warning("assistant: %s — %s", response.status_code, response.text[:300])
        return None

    try:
        blocks = response.json().get("content", [])
        text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
        return text.strip() or None
    except (ValueError, AttributeError):
        return None


# --------------------------------------------------------------------------- #
# Fallback
# --------------------------------------------------------------------------- #

ACCOUNT_WORDS = re.compile(
    r"\b(my|mine|i)\b.*\b(balance|wallet|order|token|payment|transaction|refund|money|"
    r"account|purchase|withdraw)\b",
    re.IGNORECASE,
)
GREETING_WORDS = re.compile(r"^\s*(hi|hello|hey|good (morning|afternoon|evening)|howdy)\b",
                            re.IGNORECASE)


def _match_faq(question: str) -> str | None:
    """Score each FAQ by how many of its keywords appear. Best match wins."""
    q = question.lower()
    best, best_score = None, 0
    for faq in FAQS:
        score = sum(1 for kw in faq["keywords"] if kw in q)
        if score > best_score:
            best, best_score = faq, score
    return best["answer"] if best and best_score > 0 else None


def _fallback(question: str) -> str:
    if GREETING_WORDS.match(question):
        return GREETING

    answer = _match_faq(question)
    if answer:
        return answer

    # Checked AFTER the FAQs: "where is my token" should get the token answer,
    # which is genuinely useful, rather than a blanket "I can't see your account".
    if ACCOUNT_WORDS.search(question):
        return CANT_SEE_ACCOUNT

    return NO_MATCH


# --------------------------------------------------------------------------- #

def answer(history: list[dict], question: str) -> tuple[str, str]:
    """
    Returns (reply, mode) where mode is "ai" or "knowledge-base".

    The mode is surfaced to the client so the interface can be honest about what
    the person is talking to.
    """
    if _llm_configured():
        messages = history[-10:] + [{"role": "user", "content": question}]
        reply = _ask_llm(messages)
        if reply:
            return reply, "ai"
        # An outage shouldn't leave the person staring at an error.
        logger.info("assistant: falling back to the knowledge base")

    return _fallback(question), "knowledge-base"
