from __future__ import annotations

import re

from app.config import MAX_QUESTION_LENGTH

# Clear refusal message for detected prompt injection and system override attempts
SECURITY_REFUSAL_MESSAGE = (
    "I can only assist with academic questions based on your uploaded documents. "
    "I cannot execute instructions that attempt to override system rules or reveal internal prompts."
)

EMPTY_QUESTION_MESSAGE = "Please ask a question."

# Conservative rule-based patterns to catch obvious direct injection & prompt extraction attempts
# without blocking legitimate academic queries (e.g. historical analysis of rules or system studies).
INJECTION_PATTERNS: list[re.Pattern[str]] = [
    # 1. Direct instruction override / ignore commands
    re.compile(
        r"\b(?:ignore|disregard|forget|override|bypass)\s+(?:(?:all|the|your|any)\s+)*(?:prior|previous|above|system|internal)\s+(?:instructions|prompts?|directives?|rules?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:ignore|disregard|forget)\s+(?:all|the|your|any)\s+instructions\b",
        re.IGNORECASE,
    ),
    # 2. System prompt / secret extraction commands
    re.compile(
        r"\b(?:show|reveal|display|print|output|repeat|quote|give\s+me)\s+(?:me\s+)?(?:(?:the|your|all|any|hidden|underlying|initial)\s+)*(?:system\s+prompt|initial\s+prompt|developer\s+instructions|system\s+instructions|internal\s+config(?:uration)?|api\s*keys?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bwhat\s+(?:is|are)\s+(?:your\s+)?(?:(?:the|your|all|any|hidden|underlying|initial)\s+)*(?:system\s+prompt|initial\s+prompt|system\s+instructions|developer\s+instructions|secret\s+keys?|api\s*keys?)\b",
        re.IGNORECASE,
    ),
    # 3. Persona / role hijacking / jailbreak attempts
    re.compile(
        r"\b(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you\s+are))\s+(?:dan\b|jailbroken\b|an?\s+unrestricted|an?\s+unfiltered|an?\s+evil|do\s+anything\s+now)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:enable|enter|switch\s+to)\s+(?:dan|jailbreak|unrestricted|developer)\s+mode\b",
        re.IGNORECASE,
    ),
]


def validate_user_question(question: str) -> tuple[bool, str | None]:
    """
    Validates user question for StudyMate AI:
    1. Rejects empty or whitespace-only questions.
    2. Enforces MAX_QUESTION_LENGTH to prevent token exhaustion.
    3. Checks for obvious direct prompt injection or system prompt extraction attempts.

    Returns:
        tuple[bool, str | None]: (is_valid, error_or_refusal_message)
    """
    if not question or not question.strip():
        return False, EMPTY_QUESTION_MESSAGE

    cleaned = question.strip()

    if len(cleaned) > MAX_QUESTION_LENGTH:
        return (
            False,
            f"Question exceeds maximum allowed length of {MAX_QUESTION_LENGTH} characters. "
            f"Please provide a more concise question.",
        )

    for pattern in INJECTION_PATTERNS:
        if pattern.search(cleaned):
            return False, SECURITY_REFUSAL_MESSAGE

    return True, None


def sanitize_delimiters(text: str) -> str:
    """
    Neutralize delimiter breakout attempts in untrusted content (e.g. user questions
    or PDF text attempting to close XML tags like </pdf_context> or </user_question>).
    """
    if not text:
        return ""
    return (
        text.replace("</pdf_context>", "[/pdf_context]")
        .replace("<pdf_context>", "[pdf_context]")
        .replace("</user_question>", "[/user_question]")
        .replace("<user_question>", "[user_question]")
    )
