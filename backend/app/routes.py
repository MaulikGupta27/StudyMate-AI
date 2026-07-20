from fastapi import APIRouter, File, UploadFile

from app.schemas import (
    AnswerResponse,
    QuestionRequest,
    SearchRequest,
    SearchResponse,
    UploadBatchResponse,
)
from app.services.indexing import ingest_pdfs
from app.services.retrieval import answer_question, search_chunks

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "StudyMate AI backend is healthy."}


@router.post("/documents/upload", response_model=UploadBatchResponse, tags=["Documents"])
async def upload_documents(files: list[UploadFile] = File(...)) -> UploadBatchResponse:
    # Each uploaded PDF is processed one by one so beginners can follow the flow.
    # The extracted chunks are stored together in one persistent Chroma collection.
    result = ingest_pdfs(files)

    return UploadBatchResponse(
        message="All PDFs were processed successfully.",
        total_pdfs=result["total_pdfs"],
        total_chunks=result["total_chunks"],
        processed_pdfs=result["processed_pdfs"],
    )


@router.post("/documents/search", response_model=SearchResponse, tags=["Documents"])
def search_documents(payload: SearchRequest) -> SearchResponse:
    # This is a simple search endpoint over the stored PDF chunks.
    # It does not generate answers yet; it only returns the most relevant chunks.
    results = search_chunks(payload.query, payload.top_k)

    return SearchResponse(query=payload.query, results=results)


@router.post("/ask", response_model=AnswerResponse, tags=["Questions"])
def ask_question_endpoint(payload: QuestionRequest) -> AnswerResponse:
    # Convert the question into an embedding, retrieve the best chunks, and
    # let the chat model answer using only that retrieved context.
    result = answer_question(payload.question)
    return AnswerResponse(**result)
