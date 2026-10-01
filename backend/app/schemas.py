from pydantic import BaseModel


# --- Document upload ---


class UploadedPdfItem(BaseModel):
    filename: str
    chunks_created: int


class UploadBatchResponse(BaseModel):
    message: str
    total_pdfs: int
    total_chunks: int
    processed_pdfs: list[UploadedPdfItem]
    user_id: str = "default_user"


# --- Document search ---


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    user_id: str = "default_user"


class SearchResultItem(BaseModel):
    content: str
    filename: str
    page_number: int | None = None
    score: float | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    user_id: str = "default_user"


# --- Question answering ---


class QuestionRequest(BaseModel):
    question: str
    user_id: str = "default_user"


class SourceReference(BaseModel):
    filename: str
    page_number: int


class AnswerResponse(BaseModel):
    answer: str
    source_filenames: list[str]
    source_page_numbers: list[int]
    sources: list[SourceReference]
    user_id: str = "default_user"
    memories_used: list[str] = []
