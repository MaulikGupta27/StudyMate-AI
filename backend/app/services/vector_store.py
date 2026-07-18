from pathlib import Path

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

from app.config import CHROMA_COLLECTION_NAME, CHROMA_PATH, OPENAI_API_KEY


def get_embeddings() -> OpenAIEmbeddings:
    """Create the OpenAI embeddings client used for every chunk and query."""

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing. Set it in backend/.env before using ingestion.")

    return OpenAIEmbeddings(api_key=OPENAI_API_KEY)


def get_vector_store() -> Chroma:
    """Open the single persistent Chroma collection used by the whole app."""

    Path(CHROMA_PATH).mkdir(parents=True, exist_ok=True)

    return Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=get_embeddings(),
    )