# StudyMate AI

A **Retrieval-Augmented Generation (RAG)** application that enables users to upload PDF study material, retrieve relevant document chunks using semantic search, and generate grounded answers with page-level source references using OpenAI and ChromaDB.

---

## Features

* Retrieval-Augmented Generation (RAG) pipeline
* Upload one or multiple PDF documents
* Automatic PDF parsing, text extraction, and chunking
* Semantic search using OpenAI Embeddings and ChromaDB
* AI-generated answers grounded in the retrieved document context
* Page-level source references (filename and page number) for every answer
* Conversation-style Q&A interface with chat history
* Persistent vector database for reuse across sessions

---

## RAG Pipeline

### Indexing

```text
PDF Upload
      ↓
Text Extraction
      ↓
Chunking
      ↓
OpenAI Embeddings
      ↓
ChromaDB
```

### Retrieval

```text
User Question
        ↓
Query Embedding
        ↓
Semantic Search
        ↓
Retrieved Context
        ↓
OpenAI GPT
        ↓
Grounded Answer + Source References
```

---

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Axios
* **Backend:** FastAPI, LangChain
* **LLM:** OpenAI GPT
* **Embeddings:** OpenAI Embeddings
* **Vector Database:** ChromaDB
* **PDF Processing:** PyPDF

---

## Project Structure

```text
StudyMate AI/
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── routes.py
│       ├── schemas.py
│       └── services/
│           ├── indexing.py
│           └── retrieval.py
│
└── frontend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── index.css
        └── components/
            ├── Header.jsx
            ├── UploadPdfSection.jsx
            ├── UploadedPdfList.jsx
            └── AskQuestionSection.jsx
```

---

## Installation & Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## Environment Variables

Copy the example files and configure your environment variables.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_CHAT_MODEL=gpt-4o-mini
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION_NAME=studymate_documents
ALLOWED_ORIGINS=http://localhost:5173
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Running the Application

Start the backend and frontend in separate terminals.

### Backend

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

Open your browser and visit:

```
http://localhost:5173
```

---

## Usage

1. Upload one or more PDF documents.
2. Wait for the indexing process to finish.
3. Enter a question related to the uploaded documents.
4. The system retrieves the most relevant document chunks using semantic search.
5. OpenAI generates an answer using only the retrieved context.
6. View the generated answer along with its source filenames and page numbers.
