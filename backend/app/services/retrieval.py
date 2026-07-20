from __future__ import annotations

from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import CHROMA_COLLECTION_NAME, CHROMA_PATH, OPENAI_API_KEY, OPENAI_CHAT_MODEL


def search_chunks(query: str, top_k: int = 5) -> list[dict]:
    """
    Perform semantic similarity search over the indexed document chunks.
    The retrieved chunks provide contextual information that is later
    supplied to the LLM for answer generation.
    """

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )
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


def answer_question(question: str, top_k: int = 5) -> dict:
    """
    Implements the retrieval and generation stages of the RAG pipeline.

    Workflow:
    1. Receive the user's question.
    2. Retrieve the most semantically similar chunks via search_chunks().
    3. Build a context from the retrieved chunks.
    4. Send the question and context to the LLM.
    5. Return the generated answer along with its document sources.
    """

    cleaned_question = question.strip()

    # Reject empty questions before performing retrieval.
    if not cleaned_question:
        return {
            "answer": "Please ask a question.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
        }

    # Delegate retrieval to search_chunks() to avoid duplicating search logic.
    search_results = search_chunks(cleaned_question, top_k=top_k)

    if not search_results:
        return {
            "answer": "I could not find the information in the uploaded PDFs.",
            "source_filenames": [],
            "source_page_numbers": [],
            "sources": [],
        }

    retrieved_chunks: list[dict] = []
    context_blocks: list[str] = []

    # Convert retrieved chunks into structured context for the LLM.
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
        }

    # Combine all retrieved chunks into a single context passed to the LLM.
    context = "\n\n---\n\n".join(context_blocks)

    model = ChatOpenAI(
        model=OPENAI_CHAT_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0,  # Deterministic responses for factual QA.
    )

    # The system prompt restricts the LLM to answer only from the retrieved context,
    # preventing hallucinations and encouraging grounded responses.
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

    # Remove duplicate page references before returning the final response.
    source_filenames, source_page_numbers, sources = _dedupe_sources(retrieved_chunks)

    return {
        "answer": answer_text,
        "source_filenames": source_filenames,
        "source_page_numbers": source_page_numbers,
        "sources": sources,
    }
