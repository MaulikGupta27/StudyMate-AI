from collections import OrderedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import OPENAI_API_KEY, OPENAI_CHAT_MODEL
from app.services.vector_store import get_vector_store


def _build_context_block(filename: str, page_number: int | None, content: str) -> str:
    page_label = page_number if page_number is not None else "unknown"
    return f"Filename: {filename}\nPage: {page_label}\nText: {content}"


def _dedupe_sources(retrieved_chunks: list[dict]) -> tuple[list[str], list[int], list[dict]]:
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


def answer_question(question: str, top_k: int = 5) -> dict:
    """Answer a question using only the chunks retrieved from the shared Chroma collection."""

    cleaned_question = question.strip()
    if not cleaned_question:
        return {
            "answer": "Please ask a question.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
        }

    vector_store = get_vector_store()
    matches = vector_store.similarity_search_with_score(cleaned_question, k=top_k)

    if not matches:
        return {
            "answer": "I could not find the information in the uploaded PDFs.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
        }

    retrieved_chunks: list[dict] = []
    context_blocks: list[str] = []

    for document, _score in matches:
        filename = document.metadata.get("filename", "unknown.pdf")
        page_number = document.metadata.get("page_number")

        if page_number is None:
            continue

        page_number = int(page_number)
        retrieved_chunks.append(
            {
                "filename": filename,
                "page_number": page_number,
                "content": document.page_content,
            }
        )
        context_blocks.append(_build_context_block(filename, page_number, document.page_content))

    if not retrieved_chunks:
        return {
            "answer": "I could not find the information in the uploaded PDFs.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
        }

    context = "\n\n---\n\n".join(context_blocks)

    model = ChatOpenAI(
        model=OPENAI_CHAT_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0,
    )

    messages = [
        SystemMessage(
            content=(
                """
                    You are a study assistant.

                    Answer ONLY using the provided context.

                    The context may contain information from multiple pages and multiple sections of the uploaded PDFs.

                    Search through the entire provided context before answering.

                    If the answer is spread across multiple sections or pages, combine the relevant information into a single, well-structured answer.

                    When summarizing, include all important points from the relevant sections while avoiding unnecessary repetition.

                    Ignore unrelated information that does not help answer the user's question.

                    Do not use outside knowledge or make up information.

                    If the answer cannot be found anywhere in the provided context, reply exactly:

                    I could not find the information in the uploaded PDFs.
                """
            )
        ),
        HumanMessage(
            content=(
                f"Question: {cleaned_question}\n\n"
                f"Context:\n{context}\n\n"
                "Write a short, clear answer. Do not use outside knowledge."
            )
        ),
    ]

    response = model.invoke(messages)
    answer_text = (response.content or "").strip()

    if not answer_text:
        answer_text = "I could not find the information in the uploaded PDFs."

    source_filenames, source_page_numbers, sources = _dedupe_sources(retrieved_chunks)

    return {
        "answer": answer_text,
        "source_filenames": source_filenames,
        "source_page_numbers": source_page_numbers,
        "sources": sources,
    }
