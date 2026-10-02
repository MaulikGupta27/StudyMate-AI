from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.config import (
    APP_ACCESS_PASSWORD,
    CHROMA_COLLECTION_NAME,
    CHROMA_PATH,
    OPENAI_API_KEY,
)
from app.schemas import (
    AnswerResponse,
    AuthStatusResponse,
    PasswordVerifyRequest,
    QuestionRequest,
    SearchRequest,
    SearchResponse,
    UploadBatchResponse,
)
from app.services.indexing import ingest_pdfs
from app.services.memory import clear_user_memory_and_cache
from app.services.retrieval import answer_question, search_chunks
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

router = APIRouter()


def verify_access_password(
    x_access_password: str | None = Header(default=None, alias="X-Access-Password"),
) -> None:
    """
    Enforces server-side password authentication for sensitive endpoints
    (preventing unauthorized LLM usage or database tampering).
    """
    if not APP_ACCESS_PASSWORD:
        return
    if not x_access_password or x_access_password.strip() != APP_ACCESS_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Access-Password required.",
        )


@router.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "StudyMate AI backend is healthy."}


@router.get("/auth/status", response_model=AuthStatusResponse, tags=["Auth"])
def get_auth_status(
    x_access_password: str | None = Header(default=None, alias="X-Access-Password"),
) -> AuthStatusResponse:
    if not APP_ACCESS_PASSWORD:
        return AuthStatusResponse(
            authenticated=True,
            requires_password=False,
            message="No access password configured on server.",
        )
    is_authed = bool(
        x_access_password and x_access_password.strip() == APP_ACCESS_PASSWORD
    )
    return AuthStatusResponse(
        authenticated=is_authed,
        requires_password=True,
        message="Authenticated." if is_authed else "Password required.",
    )


@router.post("/auth/verify", response_model=AuthStatusResponse, tags=["Auth"])
def verify_password(payload: PasswordVerifyRequest) -> AuthStatusResponse:
    if not APP_ACCESS_PASSWORD:
        return AuthStatusResponse(
            authenticated=True,
            requires_password=False,
            message="No access password required.",
        )
    if payload.password.strip() == APP_ACCESS_PASSWORD:
        return AuthStatusResponse(
            authenticated=True,
            requires_password=True,
            message="Access granted.",
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect access passcode. Access denied.",
    )


@router.get(
    "/documents",
    dependencies=[Depends(verify_access_password)],
    tags=["Documents"],
)
def get_user_documents(
    x_user_id: str | None = Header(default="default_user", alias="X-User-Id"),
) -> dict:
    """
    Returns the list of all PDF documents and chunk counts currently
    indexed in ChromaDB for the active user.
    """
    effective_user_id = (x_user_id or "default_user").strip() or "default_user"
    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

    data = vector_store.get(where={"user_id": effective_user_id})
    metadatas = data.get("metadatas", [])

    doc_counts: dict[str, int] = {}
    for meta in metadatas:
        filename = meta.get("filename", "unknown.pdf")
        doc_counts[filename] = doc_counts.get(filename, 0) + 1

    documents = [
        {"filename": filename, "chunks_created": count}
        for filename, count in doc_counts.items()
    ]

    return {
        "user_id": effective_user_id,
        "total_documents": len(documents),
        "documents": documents,
    }


@router.delete(
    "/documents",
    dependencies=[Depends(verify_access_password)],
    tags=["Documents"],
)
def clear_user_documents(
    x_user_id: str | None = Header(default="default_user", alias="X-User-Id"),
) -> dict:
    """
    Deletes all indexed chunks from ChromaDB for the active user,
    providing a 100% clean slate.
    """
    effective_user_id = (x_user_id or "default_user").strip() or "default_user"
    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
    )

    data = vector_store.get(where={"user_id": effective_user_id})
    chunk_ids = data.get("ids", [])
    if chunk_ids:
        vector_store.delete(ids=chunk_ids)

    # Wipe in-memory solution cache and Mem0 memories for this user
    clear_user_memory_and_cache(effective_user_id)

    return {
        "message": f"All indexed documents and memories cleared for user {effective_user_id}.",
        "deleted_chunks": len(chunk_ids),
        "user_id": effective_user_id,
    }


@router.post(
    "/documents/upload",
    response_model=UploadBatchResponse,
    dependencies=[Depends(verify_access_password)],
    tags=["Documents"],
)
async def upload_documents(
    files: list[UploadFile] = File(...),
    x_user_id: str | None = Header(default="default_user", alias="X-User-Id"),
) -> UploadBatchResponse:
    effective_user_id = (x_user_id or "default_user").strip() or "default_user"

    # Offload heavy synchronous PDF ingestion to worker threadpool to prevent blocking the event loop
    result = await run_in_threadpool(ingest_pdfs, files, effective_user_id)

    return UploadBatchResponse(
        message="All PDFs were processed successfully.",
        total_pdfs=result["total_pdfs"],
        total_chunks=result["total_chunks"],
        processed_pdfs=result["processed_pdfs"],
        user_id=effective_user_id,
    )


@router.post(
    "/documents/search",
    response_model=SearchResponse,
    dependencies=[Depends(verify_access_password)],
    tags=["Documents"],
)
def search_documents(
    payload: SearchRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> SearchResponse:
    effective_user_id = payload.user_id or x_user_id or "default_user"
    results = search_chunks(payload.query, user_id=effective_user_id, top_k=payload.top_k)

    return SearchResponse(
        query=payload.query, results=results, user_id=effective_user_id
    )


@router.post(
    "/ask",
    response_model=AnswerResponse,
    dependencies=[Depends(verify_access_password)],
    tags=["Questions"],
)
def ask_question_endpoint(
    payload: QuestionRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> AnswerResponse:
    effective_user_id = payload.user_id or x_user_id or "default_user"
    result = answer_question(payload.question, user_id=effective_user_id)
    return AnswerResponse(**result)
