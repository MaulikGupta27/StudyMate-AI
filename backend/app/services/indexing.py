from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_PATH,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    MAX_PDF_COUNT,
    OPENAI_API_KEY,
)


def _save_upload_to_temp_file(upload_file: UploadFile) -> Path:
    """
    Stream the uploaded file to disk in chunks rather than reading all bytes into RAM.
    Enforces the MAX_FILE_SIZE_BYTES limit to prevent Out-Of-Memory crashes.
    """
    filename = upload_file.filename or "uploaded.pdf"
    suffix = Path(filename).suffix or ".pdf"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1MB buffer

    try:
        while True:
            chunk = upload_file.file.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE_BYTES:
                temp_file.close()
                Path(temp_file.name).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=(
                        f"File '{filename}' exceeds maximum allowed size of "
                        f"{MAX_FILE_SIZE_MB}MB."
                    ),
                )
            temp_file.write(chunk)

        temp_file.flush()
    finally:
        temp_file.close()

    return Path(temp_file.name)


def _split_pdf_into_chunks(
    pdf_path: Path, filename: str, user_id: str = "default_user"
) -> list[Document]:
    """
    Load the PDF, split its extracted text into overlapping chunks, and attach
    metadata (filename, page number, and user_id) so retrieved chunks can be isolated
    per user and traced back to their source.
    """
    loader = PyPDFLoader(str(pdf_path))
    pages = loader.load()

    # Split text into overlapping chunks to preserve context between boundaries.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=60,
    )
    chunks = splitter.split_documents(pages)

    # Store source & user metadata with every chunk for multi-tenant isolation and citation.
    for chunk in chunks:
        page_index = chunk.metadata.get("page", 0)
        chunk.metadata["filename"] = filename
        chunk.metadata["page_number"] = int(page_index) + 1
        chunk.metadata["user_id"] = user_id

    return chunks


def ingest_pdfs(
    upload_files: list[UploadFile], user_id: str = "default_user"
) -> dict:
    """
    Implements the indexing stage of the RAG pipeline with user isolation and limits.

    Workflow:
    1. Validate batch count <= MAX_PDF_COUNT.
    2. Stream each PDF to disk while verifying size <= MAX_FILE_SIZE_MB.
    3. Extract text and split it into chunks tagged with user_id.
    4. Store chunk embeddings in ChromaDB with user_id in metadata.
    5. Delete the temporary PDF after processing.
    """
    if len(upload_files) > MAX_PDF_COUNT:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Maximum {MAX_PDF_COUNT} PDFs can be uploaded at once. "
                f"Received {len(upload_files)} files."
            ),
        )

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

    processed_pdfs: list[dict[str, int | str]] = []
    all_chunks: list[Document] = []
    all_ids: list[str] = []

    # Remove stale chunks for files being re-uploaded to prevent duplicate bloat
    try:
        incoming_names = {f.filename or "unknown.pdf" for f in upload_files}
        existing = vector_store.get(where={"user_id": user_id})
        existing_metas = existing.get("metadatas", [])
        existing_ids = existing.get("ids", [])
        stale_ids = [
            existing_ids[i]
            for i, meta in enumerate(existing_metas)
            if meta.get("filename") in incoming_names
        ]
        if stale_ids:
            vector_store.delete(ids=stale_ids)
    except Exception:
        pass

    for upload_file in upload_files:
        filename = upload_file.filename or "unknown.pdf"

        temp_path = _save_upload_to_temp_file(upload_file)

        try:
            chunks = _split_pdf_into_chunks(temp_path, filename, user_id=user_id)

            processed_pdfs.append(
                {
                    "filename": filename,
                    "chunks_created": len(chunks),
                }
            )

            for chunk in chunks:
                all_chunks.append(chunk)
                all_ids.append(
                    f"{user_id}-{filename}-{chunk.metadata.get('page_number', 0)}-{uuid4().hex}"
                )

        finally:
            temp_path.unlink(missing_ok=True)

    if all_chunks:
        vector_store.add_documents(
            documents=all_chunks,
            ids=all_ids,
        )

    return {
        "processed_pdfs": processed_pdfs,
        "total_pdfs": len(processed_pdfs),
        "total_chunks": len(all_chunks),
        "user_id": user_id,
    }
