from __future__ import annotations

from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import CHROMA_COLLECTION_NAME, CHROMA_PATH, OPENAI_API_KEY, OPENAI_CHAT_MODEL
from app.services.memory import (
    find_cached_solution,
    get_user_memories,
    store_user_interaction,
)


def search_chunks(
    query: str, user_id: str = "default_user", top_k: int = 5
) -> list[dict]:
    """
    Perform semantic similarity search over the indexed document chunks,
    filtered by user_id for multi-tenant data isolation.
    """
    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

    # Apply multi-tenant isolation filter
    filter_dict = {"user_id": user_id} if user_id else {}
    matches = vector_store.similarity_search_with_score(
        query, k=top_k, filter=filter_dict or None
    )

    # Fallback for legacy chunks uploaded before multi-tenancy was enabled
    if not matches and user_id == "default_user":
        matches = vector_store.similarity_search_with_score(query, k=top_k)

    results: list[dict] = []
    for document, score in matches:
        results.append(
            {
                "content": document.page_content,
                "filename": document.metadata.get("filename", "unknown.pdf"),
                "page_number": document.metadata.get("page_number"),
                "score": float(score),
            }
        )

    return results


def _build_context_block(filename: str, page_number: int | None, content: str) -> str:
    """
    Formats every retrieved chunk into a structured context block.
    Including the filename and page number allows the LLM's response
    to be traced back to its original source.
    """
    page_label = page_number if page_number is not None else "unknown"
    return f"Filename: {filename}\nPage: {page_label}\nText: {content}"


def _dedupe_sources(retrieved_chunks: list[dict]) -> tuple[list[str], list[int], list[dict]]:
    """
    Multiple retrieved chunks may originate from the same page.
    This function removes duplicate source references before they
    are returned to the client.
    """
    filenames: list[str] = []
    page_numbers: list[int] = []
    sources: list[dict] = []
    seen: set[tuple[str, int]] = set()

    for chunk in retrieved_chunks:
        filename = chunk["filename"]
        page_number = int(chunk["page_number"])
        source_key = (filename, page_number)

        if source_key in seen:
            continue

        seen.add(source_key)
        filenames.append(filename)
        page_numbers.append(page_number)
        sources.append({"filename": filename, "page_number": page_number})

    return filenames, page_numbers, sources


def answer_question(
    question: str, user_id: str = "default_user", top_k: int = 5
) -> dict:
    """
    Implements the retrieval and generation stages of the RAG pipeline with Mem0 memory.

    Workflow:
    1. Clean and validate user question.
    2. Check solution cache: if an answer is already known, return immediately (0 tokens).
    3. Retrieve relevant memories from Mem0 for the user (only high-relevance matches).
    4. Retrieve the most semantically similar chunks for this user from ChromaDB.
    5. Construct context incorporating document chunks and user memory.
    6. Generate a grounded answer with OpenAI GPT.
    7. Asynchronously store the interaction into Mem0 and local solution cache.
    8. Return the generated answer, page-level citations, and memories used.
    """
    cleaned_question = question.strip()

    if not cleaned_question:
        return {
            "answer": "Please ask a question.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
            "user_id": user_id,
            "memories_used": [],
        }

    # 1. Solution Memory Cache: Check if this question was already answered for this user
    cached_solution = find_cached_solution(user_id=user_id, question=cleaned_question)
    if cached_solution:
        return {
            "answer": cached_solution["answer"],
            "source_filenames": cached_solution.get("source_filenames", []),
            "source_page_numbers": cached_solution.get("source_page_numbers", []),
            "sources": cached_solution.get("sources", []),
            "user_id": user_id,
            "memories_used": ["Reused solution from memory cache (0 LLM tokens used)"],
        }

    # 2. Retrieve user memories from Mem0 (only if score exceeds relevance threshold)
    user_memories = get_user_memories(user_id=user_id, query=cleaned_question)

    # 3. Retrieve document chunks isolated by user_id
    search_results = search_chunks(cleaned_question, user_id=user_id, top_k=top_k)

    if not search_results:
        return {
            "answer": "I could not find the information in the uploaded PDFs.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
            "user_id": user_id,
            "memories_used": user_memories,
        }

    retrieved_chunks: list[dict] = []
    context_blocks: list[str] = []

    for chunk in search_results:
        page_number = chunk.get("page_number")
        if page_number is None:
            continue

        page_number = int(page_number)
        filename = chunk["filename"]

        retrieved_chunks.append(
            {
                "filename": filename,
                "page_number": page_number,
                "content": chunk["content"],
            }
        )

        context_blocks.append(
            _build_context_block(
                filename,
                page_number,
                chunk["content"],
            )
        )

    if not retrieved_chunks:
        return {
            "answer": "I could not find the information in the uploaded PDFs.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
            "user_id": user_id,
            "memories_used": user_memories,
        }

    document_context = "\n\n---\n\n".join(context_blocks)

    # Build memory context block if Mem0 returned relevant memories
    memory_section = ""
    if user_memories:
        memory_items = "\n".join(f"- {m}" for m in user_memories[:5])
        memory_section = (
            f"\n\nUser Profile & Past Conversation Context (from Mem0):\n"
            f"{memory_items}\n"
        )

    model = ChatOpenAI(
        model=OPENAI_CHAT_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0,  # Deterministic responses for factual QA
    )

    system_prompt = (
        "You are a study assistant.\n\n"
        "Answer ONLY using the provided PDF document context.\n"
        "You may use the User Profile & Past Conversation Context to resolve pronouns, "
        "understand user preferences, or refer back to previously discussed concepts.\n\n"
        "The context may contain information from multiple pages and multiple sections of the uploaded PDFs.\n"
        "Search through the entire provided context before answering.\n"
        "If the answer is spread across multiple sections or pages, combine the relevant information into a single, well-structured answer.\n"
        "When summarizing, include all important points from the relevant sections while avoiding unnecessary repetition.\n"
        "Ignore unrelated information that does not help answer the user's question.\n"
        "Do not use outside knowledge or make up information.\n"
        "If the answer cannot be found anywhere in the provided context, reply exactly:\n"
        "I could not find the information in the uploaded PDFs."
    )

    user_prompt = (
        f"Question: {cleaned_question}\n\n"
        f"Document Context:\n{document_context}"
        f"{memory_section}\n\n"
        "Write a short, clear answer. Do not use outside knowledge."
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    response = model.invoke(messages)
    answer_text = (response.content or "").strip()

    if "I could not find the information in the uploaded PDFs." in answer_text:
        source_filenames = []
        source_page_numbers = []
        sources = []
    else:
        source_filenames, source_page_numbers, sources = _dedupe_sources(retrieved_chunks)

    # Store interaction into Mem0 and local solution cache for instant future reuse
    store_user_interaction(
        user_id=user_id,
        question=cleaned_question,
        answer=answer_text,
        source_filenames=source_filenames,
        source_page_numbers=source_page_numbers,
        sources=sources,
    )

    return {
        "answer": answer_text,
        "source_filenames": source_filenames,
        "source_page_numbers": source_page_numbers,
        "sources": sources,
        "user_id": user_id,
        "memories_used": user_memories,
    }
