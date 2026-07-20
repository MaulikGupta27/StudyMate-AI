from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import CHROMA_COLLECTION_NAME, CHROMA_PATH, OPENAI_API_KEY


def _save_upload_to_temp_file(upload_file: UploadFile) -> Path:
    """
    FastAPI provides an UploadFile (file stream), whereas PyPDFLoader requires
    a file path. Therefore, the uploaded PDF is temporarily written to disk,
    processed, and deleted after ingestion.
    """

    suffix = Path(upload_file.filename or "uploaded.pdf").suffix or ".pdf"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)

    try:
        temp_file.write(upload_file.file.read())
        temp_file.flush()
    finally:
        temp_file.close()

    return Path(temp_file.name)


def _split_pdf_into_chunks(pdf_path: Path, filename: str) -> list[Document]:
    """
    Load the PDF, split its extracted text into overlapping chunks, and attach
    metadata (filename and page number) so retrieved chunks can be traced back
    to their original source.
    """

    loader = PyPDFLoader(str(pdf_path))
    pages = loader.load()

    # Split text into overlapping chunks to preserve context between chunks,
    # improving semantic retrieval during the RAG retrieval stage.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=60,
    )
    chunks = splitter.split_documents(pages)

    # Store source metadata with every chunk for citation and traceability.
    for chunk in chunks:
        page_index = chunk.metadata.get("page", 0)
        chunk.metadata["filename"] = filename
        chunk.metadata["page_number"] = int(page_index) + 1

    return chunks


def ingest_pdfs(upload_files: list[UploadFile]) -> dict:
    """
    Implements the indexing stage of the RAG pipeline.

    Workflow:
    1. Accept uploaded PDF(s).
    2. Temporarily save each PDF for processing.
    3. Extract text and split it into chunks.
    4. Store chunk embeddings in the shared vector database.
    5. Delete the temporary PDF after processing.
    """

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

    processed_pdfs: list[dict[str, int | str]] = []
    all_chunks: list[Document] = []
    all_ids: list[str] = []

    for upload_file in upload_files:
        filename = upload_file.filename or "unknown.pdf"

        # Save the uploaded PDF temporarily because PyPDFLoader
        # operates on file paths rather than UploadFile objects.
        temp_path = _save_upload_to_temp_file(upload_file)

        try:
            chunks = _split_pdf_into_chunks(temp_path, filename)

            processed_pdfs.append(
                {
                    "filename": filename,
                    "chunks_created": len(chunks),
                }
            )

            # Assign a globally unique ID to every chunk so multiple PDFs
            # can safely coexist within the same vector collection.
            for chunk in chunks:
                all_chunks.append(chunk)
                all_ids.append(
                    f"{filename}-{chunk.metadata.get('page_number', 0)}-{uuid4().hex}"
                )

        finally:
            # Remove the temporary file after processing to free disk space.
            temp_path.unlink(missing_ok=True)

    # Store all chunks in the vector database.
    # Embeddings are generated automatically by the configured embedding model.
    if all_chunks:
        vector_store.add_documents(
            documents=all_chunks,
            ids=all_ids,
        )

    return {
        "processed_pdfs": processed_pdfs,
        "total_pdfs": len(processed_pdfs),
        "total_chunks": len(all_chunks),
    }
