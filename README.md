# StudyMate AI

Upload your study material as PDFs, ask questions in natural language, and get accurate answers with page-level source references — powered by OpenAI and ChromaDB.

## Features

- Upload one or multiple PDFs at once
- Ask questions and get AI-generated answers from your documents
- View source references (filename and page number) for every answer
- Conversation-style Q&A interface with full chat history
- Persistent document storage across sessions

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Backend:** FastAPI, LangChain, OpenAI
- **Vector Database:** ChromaDB
- **PDF Processing:** PyPDF

## Project Structure

```
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
│           ├── pdf_ingestion.py
│           ├── rag_service.py
│           └── vector_store.py
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

## Environment Variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_CHAT_MODEL=gpt-4o-mini
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION_NAME=studymate_documents
ALLOWED_ORIGINS=http://localhost:5173
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:8000
```

## How to Run

Start the backend and frontend in separate terminals:

```bash
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Upload one or more PDF files using the sidebar.
2. Wait for processing to complete.
3. Type a question in the input field and submit.
4. View the AI-generated answer along with source references.

## Future Improvements

- Support for additional file formats (DOCX, TXT, Markdown)
- Chat memory for follow-up questions
- Drag-and-drop file upload with progress indicators
- Option to delete or replace uploaded documents
- Streaming responses for faster answer display
- Authentication and per-user document storage
