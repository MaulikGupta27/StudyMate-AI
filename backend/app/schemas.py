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


# --- Document search ---


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResultItem(BaseModel):
    content: str
    filename: str
    page_number: int | None = None
    score: float | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]


# --- Question answering ---


class QuestionRequest(BaseModel):
    question: str


class SourceReference(BaseModel):
    filename: str
    page_number: int


class AnswerResponse(BaseModel):
    answer: str
    source_filenames: list[str]
    source_page_numbers: list[int]
    sources: list[SourceReference]
