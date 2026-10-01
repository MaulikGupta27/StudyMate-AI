# StudyMate AI

A production-ready **Retrieval-Augmented Generation (RAG)** study assistant with **Mem0 long-term memory**, multi-tenant session isolation, and page-level source citations.

---

## Highlights

- **Grounded Q&A:** Answers generated strictly using retrieved PDF context with exact page citations.
- **Mem0 Long-Term Memory:** Retains high-relevance cross-conversation context and user preferences.
- **Solution Caching:** Instant response reuse for identical queries with 0 LLM token cost.
- **Multi-Tenant Isolation:** Documents and vector embeddings scoped per session/user ID.
- **OOM Protection:** Streamed chunk disk writes enforcing strict file size (25MB) and count (5 PDFs) limits.
- **Cross-Tab Synchronization:** Real-time state and database sync across multiple browser tabs.

---

## Architecture Flow

```text
PDF Upload ──► Stream to Disk ──► Chunk & Tag (User ID) ──► ChromaDB
                                                                 │
User Query ──► Cache Check (0 tokens) ───────────────────────────┤
                  │ (miss)                                       ▼
                  ▼                                     Semantic Search
           Mem0 Search (Score > 0.50)                            │
                  │                                              ▼
                  └────────► OpenAI GPT-4o-mini ◄── Retrieved Context Chunks
                                   │
                                   ▼
                      Answer + Page-Level Citations
```

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Backend:** FastAPI, LangChain
- **AI & Memory:** OpenAI (GPT-4o-mini & Embeddings), Mem0 Cloud API
- **Vector Database:** ChromaDB
- **PDF Processing:** PyPDF

---

## Project Structure

```text
StudyMate AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & CORS configuration
│   │   ├── config.py            # Environment settings & size limits
│   │   ├── routes.py            # Upload, document, search & QA endpoints
│   │   ├── schemas.py           # Pydantic models & request schemas
│   │   └── services/
│   │       ├── indexing.py      # Streamed disk writes, chunking & ChromaDB
│   │       ├── retrieval.py     # RAG pipeline & citation resolution
│   │       └── memory.py        # Mem0 client & in-memory solution cache
│   ├── .env.example
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Session, storage sync & chat orchestration
    │   ├── api.js               # Axios client & X-User-Id header injection
    │   └── components/
    │       ├── Header.jsx       # Session badges & New Session action
    │       ├── UploadPdfSection.jsx
    │       ├── UploadedPdfList.jsx    # Live ChromaDB sync & chunk count
    │       └── AskQuestionSection.jsx # Dynamic auto-resizing chat input
    ├── .env.example
    └── package.json
```

---

## Quickstart

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Configure `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_CHAT_MODEL=gpt-4o-mini
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION_NAME=studymate_documents
ALLOWED_ORIGINS=http://localhost:5173
MEM0_API_KEY=your_mem0_api_key_here
MAX_FILE_SIZE_MB=25
MAX_PDF_COUNT=5
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Key Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Stream & index PDFs with per-user metadata |
| `GET` | `/api/documents` | List active indexed documents & chunk counts |
| `DELETE` | `/api/documents` | Clear user's ChromaDB chunks, cache & Mem0 memories |
| `POST` | `/api/ask` | Run RAG pipeline with Mem0 context & caching |
| `GET` | `/api/health` | Backend health check |
