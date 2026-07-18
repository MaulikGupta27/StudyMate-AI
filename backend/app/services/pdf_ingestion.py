from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.vector_store import get_vector_store


def _save_upload_to_temp_file(upload_file: UploadFile) -> Path:
    """Write the uploaded PDF to disk so PyPDFLoader can read it."""

    suffix = Path(upload_file.filename or "uploaded.pdf").suffix or ".pdf"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)

    try:
        temp_file.write(upload_file.file.read())
        temp_file.flush()
    finally:
        temp_file.close()

    return Path(temp_file.name)


def _split_pdf_into_chunks(pdf_path: Path, filename: str) -> list[Document]:
    """Load one PDF, split it into chunks, and attach clean chunk metadata."""

    loader = PyPDFLoader(str(pdf_path))
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=60)
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        page_index = chunk.metadata.get("page", 0)
        chunk.metadata["filename"] = filename
        chunk.metadata["page_number"] = int(page_index) + 1

    return chunks


def ingest_pdfs(upload_files: list[UploadFile]) -> dict:
    """Process every uploaded PDF and store all chunks in the shared Chroma collection."""

    vector_store = get_vector_store()
    processed_pdfs: list[dict[str, int | str]] = []
    all_chunks: list[Document] = []
    all_ids: list[str] = []

    for upload_file in upload_files:
        filename = upload_file.filename or "unknown.pdf"
        temp_path = _save_upload_to_temp_file(upload_file)

        try:
            chunks = _split_pdf_into_chunks(temp_path, filename)
            processed_pdfs.append({"filename": filename, "chunks_created": len(chunks)})

            for chunk in chunks:
                all_chunks.append(chunk)
                all_ids.append(f"{filename}-{chunk.metadata.get('page_number', 0)}-{uuid4().hex}")
        finally:
            temp_path.unlink(missing_ok=True)

    if all_chunks:
        vector_store.add_documents(documents=all_chunks, ids=all_ids)

    return {
        "processed_pdfs": processed_pdfs,
        "total_pdfs": len(processed_pdfs),
        "total_chunks": len(all_chunks),
    }


def search_chunks(query: str, top_k: int = 5) -> list[dict]:
    """Search the shared collection across all uploaded PDFs."""

    vector_store = get_vector_store()
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