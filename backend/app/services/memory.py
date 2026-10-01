from __future__ import annotations

import logging
from typing import Any

from app.config import MEM0_API_KEY

logger = logging.getLogger(__name__)

_memory_client: Any = None

# In-memory Q&A solution cache: (user_id, normalized_question) -> cached AnswerResponse dict
# Allows answering repeat or identical queries immediately without re-calling the LLM!
_qa_cache: dict[tuple[str, str], dict] = {}


def _normalize_query(text: str) -> str:
    """Normalize query text for exact and near-match caching."""
    return " ".join(text.lower().strip().split())


def get_memory_client() -> Any:
    """
    Lazily initialize and return the Mem0 MemoryClient instance.
    """
    global _memory_client
    if _memory_client is None and MEM0_API_KEY:
        try:
            from mem0 import MemoryClient

            _memory_client = MemoryClient(api_key=MEM0_API_KEY)
            logger.info("Mem0 MemoryClient initialized successfully.")
        except Exception as e:
            logger.warning(f"Failed to initialize Mem0 MemoryClient: {e}")
            _memory_client = None

    return _memory_client


def get_user_memories(
    user_id: str, query: str, min_relevance_score: float = 0.50
) -> list[str]:
    """
    Search and retrieve relevant contextual memories from Mem0.
    Strictly filters out irrelevant memories based on relevance score threshold
    so unrelated context is never injected.
    """
    client = get_memory_client()
    if not client or not user_id:
        return []

    try:
        search_query = query.strip()
        if not search_query:
            return []

        response = client.search(search_query, filters={"user_id": user_id})
        memories: list[str] = []

        raw_results = response.get("results", []) if isinstance(response, dict) else []
        for item in raw_results:
            if not isinstance(item, dict) or not item.get("memory"):
                continue

            score = item.get("score")
            # Filter out memories that do not meet the minimum semantic relevance threshold
            if score is not None:
                try:
                    if float(score) < min_relevance_score:
                        continue
                except (ValueError, TypeError):
                    pass

            memories.append(str(item["memory"]))

        return memories
    except Exception as e:
        logger.warning(f"Mem0 search error for user {user_id}: {e}")
        return []


def find_cached_solution(user_id: str, question: str) -> dict | None:
    """
    Check if a matching solution or answer was already computed and stored
    for this user, allowing the system to skip redundant LLM inference calls.
    """
    if not user_id or not question.strip():
        return None

    key = (user_id, _normalize_query(question))
    cached = _qa_cache.get(key)
    if cached:
        logger.info(f"Cache hit! Reusing previously answered solution for: '{question}'")
        return cached

    return None


def store_user_interaction(
    user_id: str,
    question: str,
    answer: str,
    source_filenames: list[str] | None = None,
    source_page_numbers: list[int] | None = None,
    sources: list[dict] | None = None,
) -> None:
    """
    Store the Q&A conversation turn into both the in-memory solution cache
    and Mem0 for long-term semantic context.
    """
    if not user_id or not question.strip():
        return

    # Do not cache failed searches, refusals, or empty results
    if "I could not find the information in the uploaded PDFs." in answer:
        return

    # 1. Save to in-memory Q&A cache for instant reuse (0 token cost on repeat)
    norm_key = (user_id, _normalize_query(question))
    _qa_cache[norm_key] = {
        "answer": answer,
        "source_filenames": source_filenames or [],
        "source_page_numbers": source_page_numbers or [],
        "sources": sources or [],
    }

    # 2. Store to Mem0 cloud for long-term cross-session memory
    client = get_memory_client()
    if not client:
        return

    try:
        interaction_text = f"User asked: {question.strip()}\nAssistant answered: {answer.strip()}"
        client.add(interaction_text, user_id=user_id)
        logger.info(f"Stored interaction in Mem0 for user {user_id}")
    except Exception as e:
        logger.warning(f"Mem0 add error for user {user_id}: {e}")


def clear_user_memory_and_cache(user_id: str) -> None:
    """
    Purge the in-memory solution cache and wipe Mem0 memories for this user.
    """
    if not user_id:
        return

    # 1. Clear local in-memory Q&A cache
    keys_to_remove = [k for k in _qa_cache if k[0] == user_id]
    for k in keys_to_remove:
        _qa_cache.pop(k, None)

    # 2. Wipe Mem0 cloud memories for this user
    client = get_memory_client()
    if client:
        try:
            client.delete_all(user_id=user_id)
            logger.info(f"Purged Mem0 memories for user {user_id}")
        except Exception as e:
            logger.warning(f"Mem0 delete_all error for {user_id}: {e}")

