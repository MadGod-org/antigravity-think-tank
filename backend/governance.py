"""Small, side-effect-free helpers for ThinkTank review and usage governance."""

from __future__ import annotations

from typing import Any

DEFAULT_ROLE_CAPS = {"main": 50, "manager": 50, "subagents": 50}
MAX_ROLE_CAP = 500
HUMAN_REVIEW_THRESHOLD = 95


def normalize_role_caps(value: Any) -> dict[str, int]:
    result: dict[str, int] = {}
    source = value if isinstance(value, dict) else {}
    for role, default in DEFAULT_ROLE_CAPS.items():
        raw = source.get(role, default)
        try:
            if isinstance(raw, bool):
                raise ValueError("boolean is not a cap")
            cap = int(raw)
        except (TypeError, ValueError, OverflowError):
            cap = default
        result[role] = min(MAX_ROLE_CAP, max(1, cap))
    return result


def normalize_round_limit(value: Any, default: int = 50) -> int:
    try:
        if isinstance(value, bool):
            raise ValueError("boolean is not a round limit")
        limit = int(value)
    except (TypeError, ValueError, OverflowError):
        limit = default
    return min(MAX_ROLE_CAP, max(1, limit))


def role_bucket(role: Any) -> str | None:
    text = str(role or "").strip().lower().replace("_", "-")
    if "manager" in text:
        return "manager"
    if any(token in text for token in ("main", "orchestrator", "primary", "parent-agent")):
        return "main"
    if any(token in text for token in ("subagent", "sub-agent", "agent", "specialist", "worker", "critic", "reviewer", "council-agent")):
        return "subagents"
    return None


def role_usage(messages: Any) -> dict[str, int]:
    usage = {role: 0 for role in DEFAULT_ROLE_CAPS}
    for message in messages if isinstance(messages, list) else []:
        if not isinstance(message, dict):
            continue
        bucket = role_bucket(message.get("senderRole"))
        review_id = message.get("reviewId")
        if (
            message.get("isReview") is True
            and bucket in {"main", "manager"}
            and isinstance(review_id, str)
            and bool(review_id.strip())
        ):
            continue
        if bucket:
            usage[bucket] += 1
    return usage


def evaluate_review(
    confidence: Any,
    manager_summary: Any,
    main_summary: Any,
    recommendation: Any,
) -> dict[str, Any]:
    if isinstance(confidence, bool):
        raise ValueError("confidence must be an integer from 0 to 100")
    try:
        score = int(confidence)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("confidence must be an integer from 0 to 100") from error
    if score < 0 or score > 100:
        raise ValueError("confidence must be between 0 and 100")

    manager_text = str(manager_summary or "").strip()
    main_text = str(main_summary or "").strip()
    if not manager_text or not main_text:
        raise ValueError("Both manager and main-agent review messages are required")

    proposed = str(recommendation or "").strip().lower()
    if proposed not in {"continue", "complete"}:
        raise ValueError("recommendation must be 'continue' or 'complete'")

    human_required = score < HUMAN_REVIEW_THRESHOLD
    return {
        "confidence": score,
        "confidenceLabel": "evidence_score",
        "humanRequired": human_required,
        "status": "WAITING_FOR_HUMAN" if human_required else "DECIDED",
        "managerSummary": manager_text,
        "mainSummary": main_text,
        "managerRecommendation": proposed,
        "decision": None if human_required else proposed,
    }
